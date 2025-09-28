// Simple in-memory job queue for background processing
// This can be replaced with Redis/Bull in production

class JobQueue {
  constructor() {
    this.jobs = new Map();
    this.processing = new Set();
    this.maxConcurrentJobs = 3;
    this.jobTimeout = 30000; // 30 seconds timeout
  }

  // Add a job to the queue
  async addJob(jobType, jobData, priority = 'normal') {
    const jobId = `${jobType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job = {
      id: jobId,
      type: jobType,
      data: jobData,
      priority,
      status: 'pending',
      createdAt: new Date(),
      attempts: 0,
      maxAttempts: 3,
      result: null,
      error: null
    };

    this.jobs.set(jobId, job);
    console.log(`📋 Job queued: ${jobId} (${jobType})`);
    
    // Start processing if we have capacity
    this.processNextJob();
    
    return jobId;
  }

  // Process the next available job
  async processNextJob() {
    if (this.processing.size >= this.maxConcurrentJobs) {
      return; // Already at capacity
    }

    // Find next job to process (priority: high > normal > low)
    const pendingJobs = Array.from(this.jobs.values())
      .filter(job => job.status === 'pending')
      .sort((a, b) => {
        const priorityOrder = { high: 3, normal: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

    if (pendingJobs.length === 0) {
      return; // No jobs to process
    }

    const job = pendingJobs[0];
    this.processing.add(job.id);
    
    console.log(`🔄 Processing job: ${job.id} (${job.type})`);
    
    // Process job in background
    this.executeJob(job);
  }

  // Execute a job
  async executeJob(job) {
    job.status = 'processing';
    job.attempts++;
    job.startedAt = new Date();

    try {
      // Set timeout for job execution
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Job timeout')), this.jobTimeout);
      });

      // Execute job based on type
      const jobPromise = this.executeJobByType(job.type, job.data);
      
      job.result = await Promise.race([jobPromise, timeoutPromise]);
      job.status = 'completed';
      job.completedAt = new Date();
      
      console.log(`✅ Job completed: ${job.id} (${job.type})`);
      
    } catch (error) {
      job.error = error.message;
      job.status = 'failed';
      
      if (job.attempts < job.maxAttempts) {
        job.status = 'pending'; // Retry
        console.log(`🔄 Job failed, will retry: ${job.id} (attempt ${job.attempts}/${job.maxAttempts})`);
      } else {
        job.status = 'failed';
        console.log(`❌ Job failed permanently: ${job.id} (${error.message})`);
      }
    } finally {
      this.processing.delete(job.id);
      
      // Process next job
      setTimeout(() => this.processNextJob(), 100);
    }
  }

  // Execute job based on type
  async executeJobByType(jobType, jobData) {
    switch (jobType) {
      case 'calculate_goal_progress':
        return await this.calculateGoalProgress(jobData);
      case 'recalculate_all_goals':
        return await this.recalculateAllGoals(jobData);
      case 'cleanup_old_jobs':
        return await this.cleanupOldJobs();
      default:
        throw new Error(`Unknown job type: ${jobType}`);
    }
  }

  // Calculate goal progress for a specific goal
  async calculateGoalProgress({ goalId, agentId, startDate, endDate, metricType }) {
    console.log(`🎯 Calculating progress for goal ${goalId} (${metricType})`);
    
    // Import the calculation function dynamically to avoid circular dependencies
    const { calculateExistingData } = await import('../routes/goals.js');
    
    const { total: currentValue } = await calculateExistingData(
      startDate, 
      endDate, 
      agentId, 
      metricType
    );
    
    // Update goal in database
    const { db } = await import('../config/database.js');
    const { goals } = await import('../models/schema.js');
    const { eq } = await import('drizzle-orm');
    
    await db.update(goals)
      .set({ 
        currentValue: currentValue,
        updatedAt: new Date()
      })
      .where(eq(goals.id, goalId));
    
    // Invalidate cache for this goal
    const { clearGoalCache } = await import('../routes/goals.js');
    clearGoalCache(goalId);
    
    console.log(`✅ Goal ${goalId} progress updated: ${currentValue}`);
    
    return {
      goalId,
      currentValue,
      calculatedAt: new Date()
    };
  }

  // Recalculate all goals for an agent
  async recalculateAllGoals({ agentId }) {
    console.log(`🔄 Recalculating all goals for agent ${agentId}`);
    
    // Import required modules
    const { db } = await import('../config/database.js');
    const { goals } = await import('../models/schema.js');
    const { eq } = await import('drizzle-orm');
    const { calculateExistingData } = await import('../routes/goals.js');
    
    // Get all active goals for the agent
    const agentGoals = await db.select()
      .from(goals)
      .where(eq(goals.agentId, agentId));
    
    const results = [];
    
    for (const goal of agentGoals) {
      try {
        const { total: currentValue } = await calculateExistingData(
          goal.startDate,
          goal.endDate,
          goal.agentId,
          goal.metricType
        );
        
        await db.update(goals)
          .set({ 
            currentValue: currentValue,
            updatedAt: new Date()
          })
          .where(eq(goals.id, goal.id));
        
        results.push({
          goalId: goal.id,
          currentValue,
          success: true
        });
        
        console.log(`✅ Goal ${goal.id} recalculated: ${currentValue}`);
        
      } catch (error) {
        console.error(`❌ Failed to recalculate goal ${goal.id}:`, error);
        results.push({
          goalId: goal.id,
          error: error.message,
          success: false
        });
      }
    }
    
    // Clear all caches for this agent
    const { clearGoalCacheByMetric } = await import('../routes/goals.js');
    clearGoalCacheByMetric(agentId);
    
    return {
      agentId,
      totalGoals: agentGoals.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  // Cleanup old completed jobs
  async cleanupOldJobs() {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    let cleanedCount = 0;
    
    for (const [jobId, job] of this.jobs.entries()) {
      if ((job.status === 'completed' || job.status === 'failed') && 
          job.completedAt < cutoffTime) {
        this.jobs.delete(jobId);
        cleanedCount++;
      }
    }
    
    console.log(`🧹 Cleaned up ${cleanedCount} old jobs`);
    return { cleanedCount };
  }

  // Get job status
  getJobStatus(jobId) {
    return this.jobs.get(jobId) || null;
  }

  // Get queue statistics
  getStats() {
    const jobs = Array.from(this.jobs.values());
    return {
      total: jobs.length,
      pending: jobs.filter(j => j.status === 'pending').length,
      processing: jobs.filter(j => j.status === 'processing').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      processingCapacity: this.maxConcurrentJobs - this.processing.size
    };
  }

  // Cleanup old jobs periodically
  startCleanupTimer() {
    setInterval(() => {
      this.addJob('cleanup_old_jobs', {}, 'low');
    }, 60 * 60 * 1000); // Every hour
  }
}

// Create singleton instance
const jobQueue = new JobQueue();

// Start cleanup timer
jobQueue.startCleanupTimer();

export default jobQueue;
