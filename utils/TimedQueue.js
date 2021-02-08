const executeFunc = (queue) => {
  if (queue.length === 0) {
    return;
  }
  let func = queue.pop();
  func();
}

const timedQueue = function(defaultWait) {
  var queue = [];
  var interval = setInterval(() => {
    executeFunc(queue);
  }, defaultWait);
  return {
    queue: () => { return queue },
    push: (func) => { queue.push(func) },
    setWait: (wait) => {
      clearInterval(interval);
      setInterval(() => {
        executeFunc(queue);
      }, wait);
    }
  }
};

exports.timedQueue = timedQueue;