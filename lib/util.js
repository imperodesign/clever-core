'use strict';

let fs = require('fs');
let _ = require('lodash');
let glob = require('glob');
let path = require('path');

let baseRgx = /(.*).(js|coffee)$/;

// recursively walk modules path and callback for each file
function walk(wpath, type, excludeDir, callback) {
  // regex - .js or .coffee extension, case-insensitive
  // e.g. anything.js or something.coffee
  let rgx = new RegExp('(.*)-' + type + '(s?).(js|coffee)$', 'i');
  if (!fs.existsSync(wpath)) return;
  fs.readdirSync(wpath).forEach(function(file) {
    let newPath = path.join(wpath, file);
    let stat = fs.statSync(newPath);
    if (stat.isFile() && (rgx.test(file) || (baseRgx.test(file)) && ~newPath.indexOf(type))) {
      // if (!rgx.test(file)) console.log('  Consider updating filename:', newPath);
      callback(newPath);
    } else if (stat.isDirectory() && file !== excludeDir && ~newPath.indexOf(type)) {
      walk(newPath, type, excludeDir, callback);
    }
  });
}

// ability to preload requirements for tests
function preload(gpath, type) {
  glob.sync(gpath).forEach(function(file) {
    walk(file, type, null, require);
  });
}

// flatten json
function jsonFlatten(data, options) {
  let result = {};
  flatten(data, '');

  function flatten(config, root) {
    for (let index in config) {
      if (config[index] && !config[index].value && typeof(config[index]) === 'object') {
        flatten(config[index], layerRoot(root, index));
      } else {
        result[layerRoot(root, index)] = {
          'value': config[index]
        };

        if (options['default']) {
          result[layerRoot(root, index)]['default'] = config[index];
        }
      }
    }
  }

  function layerRoot(root, layer) {
    return (root ? root + '.' : '') + layer;
  }
  return result;
}

// unflatten json
function jsonUnflatten(data) {
  if (Object(data) !== data || Array.isArray(data))
    return data;
  let regex = /\.?([^.\[\]]+)|\[(\d+)\]/g,
    resultholder = {};
  for (let p in data) {
    let cur = resultholder,
      prop = '',
      m;
    while ((m = regex.exec(p))) {
      cur = cur[prop] || (cur[prop] = (m[2] ? [] : {}));
      prop = m[2] || m[1];
    }
    cur[prop] = data[p];
  }
  return resultholder[''] || resultholder;
}

// inherit objs
function inherit(a, b){
  a.prototype = Object.create(b.prototype,{constructor:{
    value:a,
    writable:false,
    enumerable:false,
    configurable:false
  }});
}

exports.inherit = inherit;
exports.jsonFlatten = jsonFlatten;
exports.jsonUnflatten = jsonUnflatten;
exports.walk = walk;
exports.preload = preload;