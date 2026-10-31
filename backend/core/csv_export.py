import csv
from django.http import HttpResponse


def csv_response(filename, header, rows):
    """Streams `rows` (an iterable of iterables) as a downloadable CSV."""
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    writer = csv.writer(response)
    writer.writerow(header)
    writer.writerows(rows)
    return response
