const punycode = require('punycode/');

var domains = ['example.com', '*.example.com', '你好.example.com'];
domains = domains.map(function (name) {
  return punycode.toASCII(name);
});
console.log(domains)