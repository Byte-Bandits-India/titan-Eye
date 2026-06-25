var TEAMS_USER = "sannadurai@neuroiq.ai";

document.getElementById("teamsCallBtn").addEventListener("click", function () {
  var appLink = "msteams://teams.microsoft.com/l/call/0/0?users=" + encodeURIComponent(TEAMS_USER);
  window.location.href = appLink;
});
