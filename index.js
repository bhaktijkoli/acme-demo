const maintainerEmail = 'hello@bhaktijkoli.com';
const subscriberEmail = 'hello@bhaktijkoli.com';
const customerEmail = 'hello@bhaktijkoli.com';
const fs = require('fs');
const path = require('path');
const pkg = require('./package.json');
const packageAgent = 'test-' + pkg.name + '/' + pkg.version;
function notify(ev, msg) {
  if ('error' === ev || 'warning' === ev) {
    errors.push(ev.toUpperCase() + ' ' + msg.message);
    return;
  }
  // be brief on all others
  console.log(ev, msg.altname || '', msg.status || '');
}

const ACME = require('acme');
const acme = ACME.create({ maintainerEmail, packageAgent, notify });
const directoryUrl = 'https://acme-v02.api.letsencrypt.org/directory'
// const directoryUrl = 'https://acme-staging-v02.api.letsencrypt.org/directory';

const start = async () => {
  await acme.init(directoryUrl);
  const Keypairs = require('@root/keypairs');
  const accountKeypair = await Keypairs.generate({ kty: 'EC', format: 'jwk' });
  const accountKey = accountKeypair.private;
  console.info('registering new ACME account...');

  const account = await acme.accounts.create({
    subscriberEmail,
    agreeToTerms: true,
    accountKey
  });

  console.info('created account with id', account.key.kid);

  const serverKeypair = await Keypairs.generate({ kty: 'RSA', format: 'jwk' });
  const serverKey = serverKeypair.private;
  const serverPem = await Keypairs.export({ jwk: serverKey });
  await fs.promises.writeFile('./privkey.pem', serverPem, 'ascii');


  const punycode = require('punycode/');

  let domains = ['test.bhaktijkoli.com'];
  domains = domains.map(function (name) {
    return punycode.toASCII(name);
  });
  console.log(domains);

  console.log("creating Signed Certificate Request");
  const CSR = require('@root/csr');
  const PEM = require('@root/pem');

  const encoding = 'der';
  const typ = 'CERTIFICATE REQUEST';

  const csrDer = await CSR.csr({ jwk: serverKey, domains, encoding });
  const csr = PEM.packBlock({ type: typ, bytes: csrDer });


  console.log("making Challenges");

  var http01 = require('acme-http-01-webroot').create({
    webroot: '/var/www/letsencrypt'
  });

  const challenges = {
    'http-01': http01,
  };

  console.info('validating domain authorization for ' + domains.join(' '));
  const pems = await acme.certificates.create({
    account,
    accountKey,
    csr,
    domains,
    challenges
  });

  const fullchain = pems.cert + '\n' + pems.chain + '\n';

  await fs.promises.writeFile('./fullchain.pem', fullchain, 'ascii');
  console.info('wrote ./fullchain.pem');

}

start()