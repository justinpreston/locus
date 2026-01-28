#!/usr/bin/env node
/**
 * scan.js - Scan memory files for actionable items
 * 
 * Looks for markers in markdown files:
 * - TODO: <text>
 * - FOLLOW-UP: <text> [due: YYYY-MM-DD]
 * - PROJECT: <text>
 * 
 * Usage: node scan.js [memory-dir] [output-file]
 */

const fs = require('fs');
const path = require('path');

const MARKERS = {
  'TODO:': { status: 'backlog', priority: 'medium' },
  'FOLLOW-UP:': { status: 'backlog', priority: 'high' },
  'PROJECT:': { status: 'backlog', priority: 'medium' },
  'IDEA:': { status: 'backlog', priority: 'low', room: 'garden' },
};

function generateId() {
  return 'scan-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 5);
}

function inferRoom(text, filePath) {
  const lower = text.toLowerCase();
  if (lower.includes('trade') || lower.includes('stock') || lower.includes('portfolio') || lower.includes('market')) {
    return 'vault';
  }
  if (lower.includes('family') || lower.includes('kid') || lower.includes('home') || lower.includes('dawson') || lower.includes('cameron')) {
    return 'hearth';
  }
  if (lower.includes('code') || lower.includes('bot') || lower.includes('api') || lower.includes('build') || lower.includes('script')) {
    return 'workshop';
  }
  return 'garden';
}

function extractDueDate(text) {
  const match = text.match(/\[due:\s*(\d{4}-\d{2}-\d{2})\]/i);
  return match ? match[1] : null;
}

function scanFile(filePath) {
  const items = [];
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const fileName = path.basename(filePath);
  
  lines.forEach((line, index) => {
    for (const [marker, defaults] of Object.entries(MARKERS)) {
      const markerIndex = line.indexOf(marker);
      if (markerIndex !== -1) {
        const text = line.slice(markerIndex + marker.length).trim();
        if (text) {
          const due = extractDueDate(text);
          const cleanText = text.replace(/\[due:\s*\d{4}-\d{2}-\d{2}\]/i, '').trim();
          
          items.push({
            id: generateId(),
            title: cleanText,
            room: defaults.room || inferRoom(cleanText, filePath),
            status: defaults.status,
            priority: defaults.priority,
            due: due,
            source: `${fileName}:${index + 1}`,
            notes: `Auto-scanned from ${filePath}`,
            tags: ['auto-scan'],
            created: new Date().toISOString().split('T')[0],
          });
        }
      }
    }
  });
  
  return items;
}

function scanDirectory(dir) {
  const items = [];
  
  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith('.md')) {
        items.push(...scanFile(fullPath));
      }
    }
  }
  
  walk(dir);
  return items;
}

function main() {
  const memoryDir = process.argv[2] || path.join(process.env.HOME, 'clawd', 'memory');
  const outputFile = process.argv[3] || path.join(__dirname, '..', 'data', 'scanned.json');
  
  console.log(`Scanning ${memoryDir}...`);
  
  const items = scanDirectory(memoryDir);
  
  console.log(`Found ${items.length} items`);
  
  fs.writeFileSync(outputFile, JSON.stringify({ scannedItems: items }, null, 2));
  console.log(`Wrote to ${outputFile}`);
  
  // Print summary
  const byRoom = {};
  items.forEach(item => {
    byRoom[item.room] = (byRoom[item.room] || 0) + 1;
  });
  
  console.log('\nBy room:');
  Object.entries(byRoom).forEach(([room, count]) => {
    console.log(`  ${room}: ${count}`);
  });
}

main();
