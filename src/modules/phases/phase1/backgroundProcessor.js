/**
 * Background Processor Module - Phase 1.1
 * Handles rendering and processing tasks in the background
 * Prevents UI blocking during heavy operations
 */

const { v4: uuidv4 } = require('uuid');

// Job status constants
const JOB_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  PAUSED: 'paused'
};

// Job priority levels
const PRIORITY = {
  LOW: 0,
  NORMAL: 1,
  HIGH: 2,
  URGENT: 3
};

class BackgroundProcessor {
  constructor(options = {}) {
    this.maxConcurrent = options.maxConcurrent || 2;
    this.jobs = new Map();
    this.queue = [];
    this.runningCount = 0;
    this.listeners = [];
    this.paused = false;
  }

  /**
   * Add a job to the processing queue
   * @param {Object} jobConfig - Job configuration
   * @returns {string} Job ID
   */
  addJob(jobConfig) {
    const job = {
      id: uuidv4(),
      name: jobConfig.name || 'Unnamed Job',
      type: jobConfig.type || 'generic',
      task: jobConfig.task,
      priority: jobConfig.priority || PRIORITY.NORMAL,
      status: JOB_STATUS.PENDING,
      progress: 0,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      error: null,
      result: null,
      metadata: jobConfig.metadata || {}
    };

    this.jobs.set(job.id, job);
    this.queue.push(job.id);
    
    // Sort queue by priority (higher priority first)
    this.queue.sort((a, b) => {
      const jobA = this.jobs.get(a);
      const jobB = this.jobs.get(b);
      return (jobB.priority || 0) - (jobA.priority || 0);
    });

    this.emit('jobAdded', job);
    this.processQueue();

    return job.id;
  }

  /**
   * Process the job queue
   */
  async processQueue() {
    if (this.paused || this.runningCount >= this.maxConcurrent) {
      return;
    }

    // Find next pending job
    const nextJobId = this.queue.find(id => {
      const job = this.jobs.get(id);
      return job && job.status === JOB_STATUS.PENDING;
    });

    if (!nextJobId) {
      return;
    }

    const job = this.jobs.get(nextJobId);
    this.runningCount++;
    job.status = JOB_STATUS.RUNNING;
    job.startedAt = new Date().toISOString();

    this.emit('jobStarted', job);

    try {
      // Execute the job task
      const result = await job.task((progress) => {
        job.progress = progress;
        this.emit('jobProgress', { job, progress });
      });

      job.status = JOB_STATUS.COMPLETED;
      job.completedAt = new Date().toISOString();
      job.progress = 100;
      job.result = result;

      this.emit('jobCompleted', job);
    } catch (error) {
      job.status = JOB_STATUS.FAILED;
      job.completedAt = new Date().toISOString();
      job.error = error.message;

      this.emit('jobFailed', { job, error });
    } finally {
      this.runningCount--;
      // Remove from queue
      this.queue = this.queue.filter(id => id !== nextJobId);
      // Process next job
      this.processQueue();
    }
  }

  /**
   * Cancel a job
   * @param {string} jobId - Job ID
   * @returns {boolean} True if cancelled
   */
  cancelJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }

    if (job.status === JOB_STATUS.PENDING) {
      job.status = JOB_STATUS.CANCELLED;
      job.completedAt = new Date().toISOString();
      this.queue = this.queue.filter(id => id !== jobId);
      this.emit('jobCancelled', job);
      return true;
    }

    // Cannot cancel running jobs in this simple implementation
    return false;
  }

  /**
   * Get job by ID
   * @param {string} jobId - Job ID
   * @returns {Object|null} Job object or null
   */
  getJob(jobId) {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get all jobs
   * @param {Object} filter - Filter options
   * @returns {Array} List of jobs
   */
  getJobs(filter = {}) {
    let jobs = Array.from(this.jobs.values());

    if (filter.status) {
      jobs = jobs.filter(j => j.status === filter.status);
    }

    if (filter.type) {
      jobs = jobs.filter(j => j.type === filter.type);
    }

    return jobs;
  }

  /**
   * Get queue status
   * @returns {Object} Queue status
   */
  getQueueStatus() {
    const jobs = Array.from(this.jobs.values());
    
    return {
      totalJobs: jobs.length,
      pendingJobs: jobs.filter(j => j.status === JOB_STATUS.PENDING).length,
      runningJobs: jobs.filter(j => j.status === JOB_STATUS.RUNNING).length,
      completedJobs: jobs.filter(j => j.status === JOB_STATUS.COMPLETED).length,
      failedJobs: jobs.filter(j => j.status === JOB_STATUS.FAILED).length,
      cancelledJobs: jobs.filter(j => j.status === JOB_STATUS.CANCELLED).length,
      queueLength: this.queue.length,
      maxConcurrent: this.maxConcurrent,
      isPaused: this.paused
    };
  }

  /**
   * Pause queue processing
   */
  pause() {
    this.paused = true;
    this.emit('queuePaused');
  }

  /**
   * Resume queue processing
   */
  resume() {
    this.paused = false;
    this.emit('queueResumed');
    this.processQueue();
  }

  /**
   * Clear completed and failed jobs
   */
  clearFinished() {
    const finishedStatuses = [JOB_STATUS.COMPLETED, JOB_STATUS.FAILED, JOB_STATUS.CANCELLED];
    
    for (const [id, job] of this.jobs) {
      if (finishedStatuses.includes(job.status)) {
        this.jobs.delete(id);
      }
    }

    this.emit('finishedCleared');
  }

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    this.listeners.push({ event, callback });
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    this.listeners = this.listeners.filter(
      l => l.event !== event || l.callback !== callback
    );
  }

  /**
   * Emit event
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    for (const listener of this.listeners) {
      if (listener.event === event) {
        listener.callback(data);
      }
    }
  }

  /**
   * Set maximum concurrent jobs
   * @param {number} max - Maximum concurrent jobs
   */
  setMaxConcurrent(max) {
    this.maxConcurrent = max;
  }

  /**
   * Get job status constants
   * @returns {Object} Status constants
   */
  static getStatusConstants() {
    return { ...JOB_STATUS };
  }

  /**
   * Get priority constants
   * @returns {Object} Priority constants
   */
  static getPriorityConstants() {
    return { ...PRIORITY };
  }
}

module.exports = BackgroundProcessor;
