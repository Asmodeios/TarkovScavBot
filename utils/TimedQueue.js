const executeFunc = (queue) => {
  if (queue.length === 0) {
    return;
  }
  let func = queue.pop();
  func();
}

const timedQueue = function(defaultWait) {
  var queue = [];
  return {
    getQueue: () => { return queue },
    push: (func) => { 
      setTimeout(() => {
        executeFunc(queue);
      }, defaultWait)
      queue.push(func) 
    },
  }
};

exports.timedQueue = timedQueue;