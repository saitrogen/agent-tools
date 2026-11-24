const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Multi-source reference API client using api-anything runtime.
 * Supports Pinterest (Tier 1 plain HTTP) and Dribbble (Tier 1 via imported session).
 */
class ReferenceApi {
  static getCliPath() {
    const mainEntry = require.resolve('api-anything');
    return path.join(path.dirname(mainEntry), 'cli.js');
  }

  static ensureSpecInstalled(siteName) {
    const homeDir = process.env.API_ANYTHING_HOME || path.join(os.homedir(), '.api-anything');
    const targetDir = path.join(homeDir, 'sites');
    const targetFile = path.join(targetDir, `${siteName}.json`);

    if (!fs.existsSync(targetFile)) {
      fs.mkdirSync(targetDir, { recursive: true });
      const bundledSpec = path.join(__dirname, `../sites/${siteName}.json`);
      if (fs.existsSync(bundledSpec)) {
        fs.copyFileSync(bundledSpec, targetFile);
      }
    }
  }

  static executeCall(siteName, op, argsStr = '') {
    this.ensureSpecInstalled(siteName);
    const cliPath = this.getCliPath();
    const cmd = `node "${cliPath}" call ${siteName} ${op} ${argsStr}`;
    let stdout;
    try {
      stdout = execSync(cmd, {
        encoding: 'utf-8',
        maxBuffer: 15 * 1024 * 1024
      });
    } catch (err) {
      stdout = err.stdout || '';
      if (stdout) {
        try {
          return JSON.parse(stdout);
        } catch {
          // fall through to throw original error
        }
      }
      throw err;
    }
    return JSON.parse(stdout);
  }

  static formatCallError(source, res) {
    const reason = res.reason || 'Request failed';
    if (source === 'dribbble' && (res.class === 'auth' || res.class === 'blocked')) {
      return `${reason}. Refresh your Dribbble session with: api-anything login dribbble.com (or api-anything login dribbble.com --window)`;
    }
    return reason;
  }

  static extractDribbbleId(urlOrId) {
    const str = String(urlOrId || '');
    const match = str.match(/\/shots\/(\d+)/) || str.match(/^(\d+)/);
    return match ? match[1] : str;
  }

  /**
   * Search for pins on Pinterest by keyword
   * @param {string} query
   */
  static searchPins(query) {
    try {
      const res = this.executeCall('pinterest', 'searchPins', `q="${query.replace(/"/g, '\\"')}"`);
      if (!res.ok) {
        throw new Error(this.formatCallError('pinterest', res));
      }
      const items = (res.data || []).map(item => ({
        ...item,
        source: 'pinterest'
      }));
      return {
        data: items,
        ms: res.ms,
        tier: res.tier
      };
    } catch (err) {
      throw new Error(`Pinterest search failed: ${err.message}`);
    }
  }

  /**
   * Search for shots on Dribbble by keyword
   * @param {string} query
   */
  static searchShots(query) {
    try {
      const res = this.executeCall('dribbble', 'searchShots', `q="${query.replace(/"/g, '\\"')}"`);
      if (!res.ok) {
        throw new Error(this.formatCallError('dribbble', res));
      }
      const items = (res.data || [])
        .filter(item => item && item.image)
        .map(item => ({
          id: this.extractDribbbleId(item.url),
          title: item.title || '',
          author: (item.author || '').trim(),
          url: item.url || '',
          dominant_color: '#EA4C89',
          image: item.image,
          source: 'dribbble'
        }));
      return {
        data: items,
        ms: res.ms,
        tier: res.tier
      };
    } catch (err) {
      throw new Error(`Dribbble search failed: ${err.message}`);
    }
  }

  /**
   * Search across a specified source: 'pinterest', 'dribbble', or 'all'
   */
  static search(source, query, count = 12) {
    if (source === 'dribbble') {
      return this.searchShots(query);
    }
    if (source === 'all') {
      const perSource = Math.ceil(count / 2);
      const pinRes = this.searchPins(query);
      const dribbbleRes = this.searchShots(query);
      const pinItems = pinRes.data.slice(0, perSource);
      const dribbbleItems = dribbbleRes.data.slice(0, perSource);
      const combined = [];
      const maxLen = Math.max(pinItems.length, dribbbleItems.length);
      for (let i = 0; i < maxLen; i++) {
        if (i < pinItems.length) combined.push(pinItems[i]);
        if (i < dribbbleItems.length) combined.push(dribbbleItems[i]);
      }
      return {
        data: combined,
        ms: (pinRes.ms || 0) + (dribbbleRes.ms || 0),
        tier: Math.max(pinRes.tier || 1, dribbbleRes.tier || 1)
      };
    }
    return this.searchPins(query);
  }

  /**
   * Get single pin details from Pinterest
   */
  static getPin(pinId) {
    try {
      const res = this.executeCall('pinterest', 'getPin', `pinId="${pinId}"`);
      if (!res.ok || !res.data || res.data.length === 0) {
        throw new Error(this.formatCallError('pinterest', res));
      }
      return { ...res.data[0], source: 'pinterest' };
    } catch (err) {
      throw new Error(`Failed to fetch pin ${pinId}: ${err.message}`);
    }
  }

  /**
   * Get single shot details from Dribbble
   */
  static getShot(shotId) {
    const cleanId = this.extractDribbbleId(shotId);
    try {
      const res = this.executeCall('dribbble', 'getShot', `shotId="${cleanId}"`);
      if (!res.ok || !res.data || res.data.length === 0) {
        throw new Error(this.formatCallError('dribbble', res));
      }
      return { ...res.data[0], id: cleanId, source: 'dribbble' };
    } catch (err) {
      throw new Error(`Failed to fetch shot ${cleanId}: ${err.message}`);
    }
  }

  /**
   * Get single item details by source
   */
  static getItem(source, id) {
    if (source === 'dribbble') {
      return this.getShot(id);
    }
    return this.getPin(id);
  }

  /**
   * Autocomplete search terms (Pinterest)
   */
  static autocomplete(query) {
    try {
      const res = this.executeCall('pinterest', 'autocomplete', `q="${query.replace(/"/g, '\\"')}"`);
      return res.data || [];
    } catch (err) {
      return [];
    }
  }
}

module.exports = ReferenceApi;
