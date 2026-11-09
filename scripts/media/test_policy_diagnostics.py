"""Failure diagnostics must remain useful without echoing database secrets."""
import json
import os
from pathlib import Path
import ssl
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from audit_storage_policy import (AuditFailure, audit, classify_postgres_error,
                                  configure_trust, connection_environment, main,
                                  run_audit, validate_response)
from test_actions_publish import metadata

DSN = 'postgresql://audit.hjqyhybgitdizfhwpdcv:DO_NOT_LEAK@aws-0-region.pooler.supabase.com:5432/postgres'


def reply(body='', code=0, error=''):
    return subprocess.CompletedProcess(['psql'], code, body, error)


class DiagnosticTests(unittest.TestCase):
    def test_error_categories_never_echo_raw_server_output(self):
        cases = {
            'network': ['could not translate host name', 'connection refused', 'Network is unreachable', 'timeout expired'],
            'tls-verification': ['SSL error: certificate verify failed', 'root certificate file does not exist', 'server certificate does not match host name'],
            'authentication': ['password authentication failed', 'Tenant or user not found', 'SASL authentication failed', 'FATAL:  28P01: failure'],
            'role-or-catalog-permission': ['ERROR:  42501: denied', 'permission denied for table pg_roles', 'role does not exist', 'role "auditor" does not exist'],
            'invalid-connection': ['unsupported startup parameter', 'invalid connection option', 'database does not exist', 'database "wrong" does not exist', 'FATAL:  3D000: missing database'],
            'sql-or-response': ['ERROR:  42601: syntax error', 'ERROR:  42703: missing column', 'ERROR:  42P01: missing relation'],
            'unexpected': ['unrecognized server failure'],
        }
        for category, messages in cases.items():
            for message in messages:
                with self.subTest(message=message):
                    error = classify_postgres_error(message + '\n' + DSN + '\nDO_NOT_LEAK')
                    self.assertEqual(error.category, category)
                    self.assertNotIn('DO_NOT_LEAK', str(error))
                    self.assertNotIn(DSN, str(error))

    def test_bad_dsns_have_safe_diagnostics(self):
        values = [None, 'not-a-url', DSN.replace(':5432/', ':DO_NOT_LEAK/'),
                  DSN.replace('hjqyhybgitdizfhwpdcv', 'otherproject'),
                  DSN.replace(':5432/', ':6543/'), DSN.replace('/postgres', '/wrong'),
                  DSN.replace('DO_NOT_LEAK', ''), DSN + '#DO_NOT_LEAK']
        for value in values:
            with self.subTest(value=value):
                with self.assertRaises(AuditFailure) as caught:
                    connection_environment(value)
                self.assertEqual(caught.exception.category, 'invalid-connection')
                self.assertNotIn('DO_NOT_LEAK', str(caught.exception))

    def test_session_pooler_settings_and_percent_encoded_password(self):
        env = connection_environment(DSN.replace('DO_NOT_LEAK', 'p%40ss%3A%2F%3F%23') + '?sslmode=disable&sslrootcert=bad')
        self.assertEqual(env['PGPASSWORD'], 'p@ss:/?#')
        self.assertEqual(env['PGPORT'], '5432')
        self.assertEqual(env['PGDATABASE'], 'postgres')
        self.assertEqual(env['PGSSLMODE'], 'verify-full')
        self.assertEqual(env['PGSSLROOTCERT'], 'system')
        self.assertEqual(env['LC_ALL'], 'C')
        self.assertIn('default_transaction_read_only=on', env['PGOPTIONS'])

    def test_subprocess_environment_removes_supabase_and_inherited_pg_secrets(self):
        with patch.dict(os.environ, {'PGSERVICE': 'do-not-use', 'SUPABASE_POLICY_CA_CERT': 'DO_NOT_LEAK',
                                     'SUPABASE_POLICY_DATABASE_URL': DSN, 'SUPABASE_SECRET_KEY': 'DO_NOT_LEAK'}):
            env = connection_environment(DSN)
        self.assertNotIn('PGSERVICE', env)
        self.assertFalse(any(k.startswith('SUPABASE_') for k in env))

    def test_valid_dashboard_ca_is_combined_with_system_roots_in_private_temp_file(self):
        # An existing system CA supplies a valid PEM fixture; no generated artwork/media or remote trust claim.
        pem = ssl.DER_cert_to_PEM_cert(ssl.create_default_context().get_ca_certs(binary_form=True)[0])
        with patch.dict(os.environ, {'SUPABASE_POLICY_CA_CERT': pem}, clear=True), tempfile.TemporaryDirectory() as directory:
            env = connection_environment(DSN)
            self.assertEqual(configure_trust(env, directory), 'system-plus-configured-ca')
            path = Path(env['PGSSLROOTCERT'])
            self.assertEqual(path.stat().st_mode & 0o777, 0o600)
            self.assertTrue(ssl.create_default_context(cafile=str(path)).get_ca_certs())
            self.assertEqual(env['PGSSLMODE'], 'verify-full')
        self.assertFalse(path.exists())

    def test_invalid_ca_and_private_keys_fail_before_connection(self):
        for pem in ['DO_NOT_LEAK', '-----BEGIN PRIVATE KEY-----\nDO_NOT_LEAK\n-----END PRIVATE KEY-----',
                    '-----BEGIN CERTIFICATE-----\nDO_NOT_LEAK\n-----END CERTIFICATE-----']:
            with patch.dict(os.environ, {'SUPABASE_POLICY_CA_CERT': pem}, clear=True), tempfile.TemporaryDirectory() as directory:
                with self.assertRaises(AuditFailure) as caught:
                    configure_trust(connection_environment(DSN), directory)
                self.assertEqual(caught.exception.category, 'tls-verification')
                self.assertNotIn('DO_NOT_LEAK', str(caught.exception))

    def test_custom_ca_file_is_verified_without_weakening_tls(self):
        with patch.dict(os.environ, {'SUPABASE_POLICY_SSLROOTCERT': '/missing/DO_NOT_LEAK'}, clear=True), tempfile.TemporaryDirectory() as directory:
            with self.assertRaises(AuditFailure) as caught:
                configure_trust(connection_environment(DSN), directory)
            self.assertNotIn('DO_NOT_LEAK', str(caught.exception))

    def test_query_failure_uses_classifier_and_never_prints_stderr(self):
        with patch.dict(os.environ, {'SUPABASE_POLICY_DATABASE_URL': DSN}, clear=True), patch('audit_storage_policy.subprocess.run', side_effect=[reply('psql (PostgreSQL) 16.4'), reply(code=2, error='SSL error: certificate verify failed ' + DSN)]) as proc:
            with self.assertRaises(AuditFailure) as caught:
                run_audit()
            self.assertEqual(caught.exception.category, 'tls-verification')
            self.assertNotIn('DO_NOT_LEAK', str(caught.exception))
            args = proc.call_args.args[0]
            self.assertNotIn(DSN, args)
            self.assertIn('VERBOSITY=verbose', args)
            self.assertEqual(proc.call_args.kwargs['env']['PGSSLMODE'], 'verify-full')

    def test_client_version_missing_client_and_timeout_are_safe(self):
        for effect, category in [(FileNotFoundError(DSN), 'invalid-connection'),
                                 (subprocess.TimeoutExpired(['psql', DSN], 45, stderr=DSN), 'network'),
                                 (OSError(DSN), 'unexpected')]:
            with patch.dict(os.environ, {'SUPABASE_POLICY_DATABASE_URL': DSN}, clear=True), patch('audit_storage_policy.subprocess.run', side_effect=effect):
                with self.assertRaises(AuditFailure) as caught:
                    run_audit()
                self.assertEqual(caught.exception.category, category)
                self.assertNotIn('DO_NOT_LEAK', str(caught.exception))
        with patch.dict(os.environ, {'SUPABASE_POLICY_DATABASE_URL': DSN}, clear=True), patch('audit_storage_policy.subprocess.run', return_value=reply('psql (PostgreSQL) 15.9')) as proc:
            with self.assertRaises(AuditFailure):
                run_audit()
            self.assertEqual(proc.call_count, 1)

    def test_malformed_or_absent_catalog_data_cannot_pass(self):
        for value in ['', DSN, 'null', '[]', '{}', json.dumps(dict(rowSecurity=True, roles=[], policies=[{}]))]:
            with self.assertRaises(AuditFailure) as caught:
                validate_response(value)
            self.assertEqual(caught.exception.category, 'sql-or-response')
            self.assertNotIn('DO_NOT_LEAK', str(caught.exception))

    def test_success_reports_safe_connection_metadata_without_dsn(self):
        with patch.dict(os.environ, {'SUPABASE_POLICY_DATABASE_URL': DSN}, clear=True), patch('audit_storage_policy.subprocess.run', side_effect=[reply('psql (PostgreSQL) 16.4'), reply(json.dumps(metadata()))]):
            report = run_audit()
        self.assertTrue(report['verified'])
        self.assertEqual(report['connection']['mode'], 'session-pooler')
        self.assertEqual(report['connection']['tlsMode'], 'verify-full')
        self.assertNotIn('DO_NOT_LEAK', json.dumps(report))

    def test_missing_connection_writes_failure_report_and_nonzero_exit(self):
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, {}, clear=True):
            path = Path(directory) / 'report.json'
            with patch('sys.argv', ['audit', '--report', str(path)]), self.assertRaises(SystemExit) as caught:
                main()
            report = json.loads(path.read_text())
            self.assertFalse(report['verified'])
            self.assertEqual(report['category'], 'invalid-connection')
            self.assertIn('invalid-connection', str(caught.exception))

    def test_database_failure_report_and_exit_do_not_expose_credentials(self):
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, {'SUPABASE_POLICY_DATABASE_URL': DSN}, clear=True):
            path = Path(directory) / 'report.json'
            with patch('sys.argv', ['audit', '--report', str(path)]), patch('audit_storage_policy.subprocess.run',
                    side_effect=[reply('psql (PostgreSQL) 16.4'), reply(code=2, error='password authentication failed ' + DSN)]), self.assertRaises(SystemExit) as caught:
                main()
            report = json.loads(path.read_text())
            self.assertFalse(report['verified'])
            self.assertEqual(report['category'], 'authentication')
            self.assertNotIn('DO_NOT_LEAK', path.read_text() + str(caught.exception))

    def test_unproved_policy_names_are_identified_without_changing_them(self):
        name = 'student upload\n::warning::'
        with self.assertRaises(AuditFailure) as caught:
            audit(metadata([dict(name=name, command='INSERT', permissive='PERMISSIVE', roles=['authenticated'])]))
        self.assertEqual(caught.exception.category, 'policy-enforcement')
        self.assertIn(json.dumps(name), str(caught.exception))
        self.assertNotIn('\n', str(caught.exception))


if __name__ == '__main__':
    unittest.main()
