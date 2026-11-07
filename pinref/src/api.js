const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Pinterest API client using api-anything runtime.
 * Fully location-independent: finds its own cli and bundles its own spec.
 */
class PinterestApi {
  static getCliPath() {
    const mainEntry = require.resolve('api-anything');
    return path.join(path.dirname(mainEntry), 'cli.js');
  }

  static ensureSpecInstalled() {
    const homeDir = process.env.API_ANYTHING_HOME || path.join(os.homedir(), '.api-anything');
    const targetDir = path.join(homeDir, 'sites');
    const targetFile = path.join(targetDir, 'pinterest.json');

    if (!fs.existsSync(targetFile)) {
      fs.mkdirSync(targetDir, { recursive: true });
      const bundledSpec = path.join(__dirname, '../sites/pinterest.json');
      if (fs.existsSync(bundledSpec)) {
        fs.copyFileSync(bundledSpec, targetFile);
      }
    }
  }

  static executeCall(op, argsStr = '') {
    this.ensureSpecInstalled();
    const cliPath = this.getCliPath();
    const cmd = `node "${cliPath}" call pinterest ${op} ${argsStr}`;
    const stdout = execSync(cmd, {
      encoding: 'utf-8',
      maxBuffer: 15 * 1024 * 1024
    });
    return JSON.parse(stdout);
  }

  /**
   * Search for pins by keyword
   * @param {string} query
   * @returns {{data: Array<{id: string, node_id: string, dominant_color: string, image: string}>, ms: number, tier: number}}
   */
  static searchPins(query) {
    try {
      const res = this.executeCall('searchPins', `q="${query.replace(/"/g, '\\"')}"`);
      if (!res.ok) {
        throw new Error(res.reason || 'Search failed');
      }
      return {
        data: res.data || [],
        ms: res.ms,
        tier: res.tier
      };
    } catch (err) {
      throw new Error(`Pinterest search failed: ${err.message}`);
    }
  }

  /**
   * Get single pin details
   * @param {string} pinId
   * @returns {{title: string, description: string, image: string, repins: string}}
   */
  static getPin(pinId) {
    try {
      const res = this.executeCall('getPin', `pinId="${pinId}"`);
      if (!res.ok || !res.data || res.data.length === 0) {
        throw new Error(res.reason || 'Failed to get pin details');
      }
      return res.data[0];
    } catch (err) {
      throw new Error(`Failed to fetch pin ${pinId}: ${err.message}`);
    }
  }

  /**
   * Autocomplete search terms
   * @param {string} query
   * @returns {Array<{label: string, query: string, url: string}>}
   */
  static autocomplete(query) {
    try {
      const res = this.executeCall('autocomplete', `q="${query.replace(/"/g, '\\"')}"`);
      return res.data || [];
    } catch (err) {
      return [];
    }
  }
}

module.exports = PinterestApi;
