const numberWithCommas = (number) => {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

const formatSeconds = (time) => {
  
  const pad = (n) => {
    return (`00${n}`).slice(-2)
  }

  let seconds = time % 60;
  time = (time - seconds) / 60;
  let minutes = time % 60;
  let hours = (time - minutes) / 60;

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

module.exports = {
  numberWithCommas,
  formatSeconds,
}