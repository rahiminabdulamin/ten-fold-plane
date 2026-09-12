import requests

from plane.bgtasks.spreadsheet_task import grist_failure_code, process_spreadsheet_operation_now


def test_grist_failure_code_preserves_safe_http_status():
    response = requests.Response()
    response.status_code = 404
    error = requests.HTTPError(response=response)

    assert grist_failure_code(error) == "grist_http_404"


def test_grist_failure_code_classifies_connectivity_without_error_details():
    assert grist_failure_code(requests.ConnectionError("private host")) == "grist_connection_failed"


def test_synchronous_operation_processor_is_not_a_celery_task():
    assert not hasattr(process_spreadsheet_operation_now, "delay")
