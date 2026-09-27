import {test} from 'node:test';
import assert from 'node:assert/strict';
import {authErrorMessage} from '../app/auth-errors.ts';

test('SMTP server failures are distinct from a network failure', () => {
  const server = authErrorMessage({status: 500, code: 'unexpected_failure'}, 'register');
  const network = authErrorMessage({name: 'AuthRetryableFetchError'}, 'register');
  assert.match(server, /servizio di registrazione e invio email/);
  assert.match(network, /Non riesco a raggiungere/);
  assert.notEqual(server, network);
});
test('server errors take priority even when the SDK marks them retryable', () => {
  assert.match(authErrorMessage({status: 503, name: 'AuthRetryableFetchError'}, 'login'), /temporaneamente indisponibile/);
});
test('provider details and account existence are never disclosed', () => {
  const message = authErrorMessage({status: 500, message: '535 secret@example.com re_secret'}, 'forgot');
  assert.doesNotMatch(message, /secret|535|@/);
  assert.equal(authErrorMessage({code:'invalid_credentials'}, 'login'), 'Email o password non corrette.');
});
