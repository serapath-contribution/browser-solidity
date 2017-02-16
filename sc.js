var sauceConnectLauncher = require('sauce-connect-launcher')

if (!process.env.SAUCE_USER || !process.env.SAUCE_GUID) throw new Error('missing credentials')

var options = {
  username: process.env.SAUCE_USER, // Sauce Labs username.
  accessKey: process.env.SAUCE_GUID, // Sauce Labs access key.
  tunnelIdentifier: process.env.TUNNEL_IDENTIFIER, // Identity the tunnel for concurrent tunnels (optional)
  verbose: true,//false, // Log output from the `sc` process to stdout?
  verboseDebugging: true,//false, // Enable verbose debugging (optional)
  vv: true,//false, // Together with verbose debugging will output HTTP headers as well (optional)
  // port: null, // Port on which Sauce Connect's Selenium relay will listen for requests. Default 4445. (optional)
  // proxy: null, // Proxy host and port that Sauce Connect should use to connect to the Sauce Labs cloud. e.g. "localhost:1234" (optional)
  // logfile: null, // Change sauce connect logfile location (optional)
  // logStats: null, // Period to log statistics about HTTP traffic in seconds (optional)
  // maxLogsize: null, // Maximum size before which the logfile is rotated (optional)
  // doctor: true, // Set to true to perform checks to detect possible misconfiguration or problems (optional)
  // fastFailRegexps: null, // an array or comma-separated list of regexes whose matches will not go through the tunnel. (optional)
  // directDomains: null, // an array or comma-separated list of domains that will not go through the tunnel. (optional)
  // // an optional suffix to be appended to the `readyFile` name.
  // // useful when running multiple tunnels on the same machine,
  // // such as in a continuous integration environment. (optional)
  // readyFileId: null,
  // connectRetries: 0, // retry to establish a tunnel multiple times. (optional)
  // connectRetryTimeout: 2000, // time to wait between connection retries in ms. (optional)
  // downloadRetries: 0, // retry to download the sauce connect archive multiple times. (optional)
  // downloadRetryTimeout: 1000, // time to wait between download retries in ms. (optional)
  // exe: null, // path to a sauce connect executable (optional) by default the latest sauce connect version is downloaded
  // // keep sc running after the node process exited, this means you need to close
  // // the process manually once you are done using the pidfile
  // // Attention: This only works with sc versions <= 4.3.16 and only on macOS and
  // // linux at the moment
  // detached: null,
  // // specify a connect version instead of fetching the latest version, this currently
  // // does not support checksum verification
  // connectVersion: 'latest',
  logger: console.log // function (message) {}, // A function to optionally write sauce-connect-launcher log messages. e.g. `console.log`.  (optional)
}

sauceConnectLauncher(options, function (err, sauceConnectProcess) {
  if (err) return console.error(err.message)
  console.log("Sauce Connect ready")
  sauceConnectProcess.close(function () {
    console.log("Closed Sauce Connect process")
  })
})
