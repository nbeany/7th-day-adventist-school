from rest_framework.pagination import PageNumberPagination


class StandardResultsSetPagination(PageNumberPagination):
    """
    Bounds response size on every list endpoint. The default page size is
    generous (100) so existing dropdown/select consumers that expect "all"
    records keep working for a typical school's dataset; ?page_size= can
    raise it up to max_page_size for bulk exports, and the frontend's axios
    layer transparently unwraps the `results` envelope so page-1 consumers
    don't need to change.
    """
    page_size = 100
    page_size_query_param = 'page_size'
    max_page_size = 1000
