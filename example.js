function assert(cond, error) {
  if (cond) {
    throw error;
  }
}

function createRouterNode(key, value) {
  return {
    key,
    value,
    normal: {},
  };
}

function addRoute(
  parent,
  path,
  value,
) {
  let node = parent;
  let paths = '';
  for (let i = 0, len = path.length; i < len; i += 1) {
    const current = path[i];
    if (i !== 0) {
      paths += `/${current}`;
    }
    if (/^\[\.\.\.[a-zA-Z0-9]+\]$/.test(current)) {
      const key = current.substring(4, current.length - 1);
      const matched = node.glob;
      assert(matched && matched !== key && matched.value, new Error(`Conflicting glob path at ${paths}`));
      if (!matched) {
        node.glob = createRouterNode(key, i === len - 1 ? value : undefined);
      } else if (i === len - 1) {
        matched.value = value;
      }
      node = node.glob;
    } else if (/^\[[a-zA-Z0-9]+\]$/.test(current)) {
      const key = current.substring(1, current.length - 1);
      const matched = node.named;
      assert(matched && matched !== key && matched.value, new Error(`Conflicting named path at ${paths}`));
      if (!matched) {
        node.named = createRouterNode(key, i === len - 1 ? value : undefined);
      } else if (i === len - 1) {
        matched.value = value;
      }
      node = node.named;
    } else {
      let matched = node.normal[current];
      assert(matched && i === len - 1 && matched.value, new Error(`Conflicting path at ${paths}`));
      if (!matched) {
        node.normal[current] = createRouterNode(current, i === len - 1 ? value : undefined);
      } else if (i === len - 1) {
        matched.value = value;
      }
      node = node.normal[current];
    }
  }
}

function normalizePath(route) {
  return route.endsWith('/')
    ? route.substring(0, route.length - 1)
    : route;
}

function createRouterTree(routes) {
  const root = createRouterNode('');

  for (let i = 0, len = routes.length; i < len; i += 1) {
    const route = routes[i];
    addRoute(root, normalizePath(route.path).split('/'), route.value);
  }

  return root;
}

function matchRoute(root, path) {
  const params = {};
  const pages = [];
  const paths = normalizePath(path).split('/');
  let node = root;

  for (let i = 0, len = paths.length; i < len; i += 1) {
    const current = paths[i];
    if (current in node.normal) {
      node = node.normal[current];
      pages.push({
        result: node.value,
        params: {...params},
      });
    } else if (node.named) {
      node = node.named;
      params[node.key] = current;
      pages.push({
        result: node.value,
        params: {...params},
      });
    } else if (node.glob) {
      node = node.glob;
      const list = [];
      for (k = i; k < len; k += 1) {
        list.push(paths[k]);
      }
      params[node.key] = list;
      pages.push({
        result: node.value,
        params: {...params},
      });
      break;
    } else {
      return [];
    }
  }

  return pages;
}

const tree = createRouterTree([
  { path: '/a', value: 'a' },
  { path: '/b', value: 'b' },
  { path: '/', value: 'index' },
  { path: '/parameter/[id]', value: 'param' },
  { path: '/wildcard/[...list]', value: 'glob' },
]);

console.dir(matchRoute(tree, '/wildcard/c/world/example'), { depth: null })