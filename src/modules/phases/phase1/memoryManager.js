/**
 * Memory Manager Module - Phase 1.1
 * Intelligent memory management for 4K+ projects
 * Monitors and optimizes memory usage during video editing
 */

const os = require('os');

// Memory thresholds (in bytes)
const MB = 1024 * 1024;
const GB = 1024 * MB;

const DEFAULT_CONFIG = {
  maxMemoryUsage: 2 * GB,           // Default max 2GB
  warningThreshold: 0.75,           // Warning at 75% usage
  criticalThreshold: 0.90,          // Critical at 90% usage
  cleanupThreshold: 0.80,           // Auto-cleanup at 80%
  monitorInterval: 5000,            // Monitor every 5 seconds
  enableAutoCleanup: true
};

class MemoryManager {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.caches = new Map();        // Named caches for different data types
    this.monitoring = false;
    this.monitorIntervalId = null;
    this.listeners = [];            // Event listeners
    this.stats = {
      peakUsage: 0,
      cleanupCount: 0,
      lastCleanupTime: null
    };
  }

  /**
   * Get current memory usage statistics
   * @returns {Object} Memory usage stats
   */
  getMemoryStats() {
    const used = process.memoryUsage();
    const systemTotal = os.totalmem();
    const systemFree = os.freemem();

    return {
      heapUsed: used.heapUsed,
      heapTotal: used.heapTotal,
      external: used.external,
      rss: used.rss,
      systemTotal,
      systemFree,
      systemUsed: systemTotal - systemFree,
      systemUsagePercent: ((systemTotal - systemFree) / systemTotal) * 100,
      heapUsagePercent: (used.heapUsed / used.heapTotal) * 100,
      formatted: {
        heapUsed: this.formatBytes(used.heapUsed),
        heapTotal: this.formatBytes(used.heapTotal),
        rss: this.formatBytes(used.rss),
        systemFree: this.formatBytes(systemFree),
        systemTotal: this.formatBytes(systemTotal)
      }
    };
  }

  /**
   * Format bytes to human-readable string
   * @param {number} bytes - Bytes to format
   * @returns {string} Formatted string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Create or get a named cache
   * @param {string} name - Cache name
   * @param {Object} options - Cache options
   * @returns {Map} Cache instance
   */
  getCache(name, options = {}) {
    if (!this.caches.has(name)) {
      this.caches.set(name, {
        data: new Map(),
        maxSize: options.maxSize || 100 * MB,
        currentSize: 0,
        hits: 0,
        misses: 0
      });
    }
    return this.caches.get(name);
  }

  /**
   * Add item to cache
   * @param {string} cacheName - Cache name
   * @param {string} key - Item key
   * @param {*} value - Item value
   * @param {number} size - Item size in bytes
   * @returns {boolean} True if added successfully
   */
  cacheItem(cacheName, key, value, size = 0) {
    const cache = this.getCache(cacheName);
    
    // Check if we need to make room
    if (cache.currentSize + size > cache.maxSize) {
      this.evictFromCache(cacheName, size);
    }

    // Still too big?
    if (cache.currentSize + size > cache.maxSize) {
      return false;
    }

    cache.data.set(key, { value, size, timestamp: Date.now() });
    cache.currentSize += size;
    return true;
  }

  /**
   * Get item from cache
   * @param {string} cacheName - Cache name
   * @param {string} key - Item key
   * @returns {*} Cached value or undefined
   */
  getCachedItem(cacheName, key) {
    const cache = this.getCache(cacheName);
    const item = cache.data.get(key);
    
    if (item) {
      cache.hits++;
      item.timestamp = Date.now(); // Update access time
      return item.value;
    }
    
    cache.misses++;
    return undefined;
  }

  /**
   * Evict oldest items from cache
   * @param {string} cacheName - Cache name
   * @param {number} bytesNeeded - Bytes to free
   */
  evictFromCache(cacheName, bytesNeeded) {
    const cache = this.getCache(cacheName);
    const items = Array.from(cache.data.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    let freedBytes = 0;
    for (const [key, item] of items) {
      if (freedBytes >= bytesNeeded) break;
      
      cache.data.delete(key);
      cache.currentSize -= item.size;
      freedBytes += item.size;
    }
  }

  /**
   * Clear a specific cache
   * @param {string} cacheName - Cache name to clear
   */
  clearCache(cacheName) {
    const cache = this.caches.get(cacheName);
    if (cache) {
      cache.data.clear();
      cache.currentSize = 0;
    }
  }

  /**
   * Clear all caches
   */
  clearAllCaches() {
    for (const [name] of this.caches) {
      this.clearCache(name);
    }
    this.stats.cleanupCount++;
    this.stats.lastCleanupTime = new Date().toISOString();
  }

  /**
   * Start memory monitoring
   * @returns {boolean} True if started
   */
  startMonitoring() {
    if (this.monitoring) {
      return false;
    }

    this.monitoring = true;
    this.monitorIntervalId = setInterval(() => {
      this.checkMemory();
    }, this.config.monitorInterval);

    return true;
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring() {
    if (this.monitorIntervalId) {
      clearInterval(this.monitorIntervalId);
      this.monitorIntervalId = null;
    }
    this.monitoring = false;
  }

  /**
   * Check memory and trigger actions if needed
   */
  checkMemory() {
    const stats = this.getMemoryStats();
    const usage = stats.rss;
    
    // Update peak usage
    if (usage > this.stats.peakUsage) {
      this.stats.peakUsage = usage;
    }

    const usagePercent = usage / this.config.maxMemoryUsage;

    // Check thresholds
    if (usagePercent >= this.config.criticalThreshold) {
      this.emit('critical', stats);
      if (this.config.enableAutoCleanup) {
        this.performCleanup();
      }
    } else if (usagePercent >= this.config.warningThreshold) {
      this.emit('warning', stats);
    } else if (usagePercent >= this.config.cleanupThreshold && this.config.enableAutoCleanup) {
      this.performCleanup();
    }
  }

  /**
   * Perform memory cleanup
   */
  performCleanup() {
    // Clear oldest cache entries
    for (const [name, cache] of this.caches) {
      const targetSize = cache.maxSize * 0.5; // Reduce to 50%
      const bytesToFree = cache.currentSize - targetSize;
      if (bytesToFree > 0) {
        this.evictFromCache(name, bytesToFree);
      }
    }

    // Request garbage collection if available
    if (global.gc) {
      global.gc();
    }

    this.stats.cleanupCount++;
    this.stats.lastCleanupTime = new Date().toISOString();
    this.emit('cleanup', this.getMemoryStats());
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
   * Get cache statistics
   * @param {string} cacheName - Cache name (optional)
   * @returns {Object} Cache stats
   */
  getCacheStats(cacheName = null) {
    if (cacheName) {
      const cache = this.caches.get(cacheName);
      if (!cache) return null;
      
      return {
        name: cacheName,
        size: cache.currentSize,
        maxSize: cache.maxSize,
        itemCount: cache.data.size,
        hits: cache.hits,
        misses: cache.misses,
        hitRate: cache.hits / (cache.hits + cache.misses) || 0
      };
    }

    const allStats = {};
    for (const [name, cache] of this.caches) {
      allStats[name] = {
        size: cache.currentSize,
        maxSize: cache.maxSize,
        itemCount: cache.data.size,
        hits: cache.hits,
        misses: cache.misses,
        hitRate: cache.hits / (cache.hits + cache.misses) || 0
      };
    }
    return allStats;
  }

  /**
   * Get manager statistics
   * @returns {Object} Manager stats
   */
  getStats() {
    return {
      ...this.stats,
      peakUsageFormatted: this.formatBytes(this.stats.peakUsage),
      isMonitoring: this.monitoring,
      cacheCount: this.caches.size,
      config: { ...this.config }
    };
  }

  /**
   * Update configuration
   * @param {Object} newConfig - New configuration values
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
}

module.exports = MemoryManager;
