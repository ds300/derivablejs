// this gets added to the end of the bundle at dev time
window.addEventListener('load', function () {
  new WebSocket("ws://"+window.location.hostname+":__PORT__/").addEventListener('message', function () {
    window.location.reload();
  });
});
