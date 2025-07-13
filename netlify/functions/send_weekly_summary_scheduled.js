const handler = require('./summaryHandler.js');

exports.handler = async function(event, context) {
  return handler(event, context);
};
