import { DocumentIngestionFailedError } from '../../../domain/errors/document-ingestion-failed.error';
import type { UploadedFile } from '../../../domain/uploaded-file';
import {
  RagflowDocumentIngestionAdapter,
  type RagflowIngestionConfig,
} from '../ragflow-document-ingestion.adapter';

const CONFIG: RagflowIngestionConfig = {
  apiUrl: 'http://ragflow:9380',
  apiKey: 'ragflow-test-key',
  datasetId: '527fa74891e811ef9c650242ac120006',
  timeoutMs: 1000,
};

const RAGFLOW_DOCUMENT_ID = 'b330ec2e91ec11efbc510242ac120004';

const aPdf = (): UploadedFile => ({
  fileName: 'resolution-1234.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 8,
  content: Buffer.from('%PDF-1.7'),
});

const mockFetch = (body: unknown, init?: { ok?: boolean; status?: number }) => {
  const fetchMock = jest.fn().mockResolvedValue({
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    json: () => Promise.resolve(body),
  });
  global.fetch = fetchMock;
  return fetchMock;
};

describe('RagflowDocumentIngestionAdapter', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uploads the file to the configured dataset and returns the document_id', async () => {
    const fetchMock = mockFetch({
      code: 0,
      data: [
        {
          id: RAGFLOW_DOCUMENT_ID,
          dataset_id: CONFIG.datasetId,
          name: 'x.pdf',
        },
      ],
    });

    const result = await new RagflowDocumentIngestionAdapter(CONFIG).ingest(
      aPdf(),
    );

    expect(result).toEqual({
      documentId: RAGFLOW_DOCUMENT_ID,
      datasetId: CONFIG.datasetId,
    });

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      `http://ragflow:9380/api/v1/datasets/${CONFIG.datasetId}/documents`,
    );
    expect(options.method).toBe('POST');
    expect(options.headers).toEqual({
      Authorization: `Bearer ${CONFIG.apiKey}`,
    });
    // No manual Content-Type: fetch sets it with the right boundary.
    expect(options.body).toBeInstanceOf(FormData);
  });

  it('fails when RAGFlow returns a code other than 0', async () => {
    mockFetch({ code: 101, message: 'No file part!' });

    await expect(
      new RagflowDocumentIngestionAdapter(CONFIG).ingest(aPdf()),
    ).rejects.toThrow(DocumentIngestionFailedError);
  });

  it('fails when the HTTP status is not 2xx', async () => {
    mockFetch({}, { ok: false, status: 401 });

    await expect(
      new RagflowDocumentIngestionAdapter(CONFIG).ingest(aPdf()),
    ).rejects.toThrow(/HTTP 401/);
  });

  it('fails when the response does not have the expected shape', async () => {
    mockFetch({ code: 0, data: [{ id: 42 }] });

    await expect(
      new RagflowDocumentIngestionAdapter(CONFIG).ingest(aPdf()),
    ).rejects.toThrow(DocumentIngestionFailedError);
  });

  it('turns a network failure into a domain error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('fetch failed'));

    await expect(
      new RagflowDocumentIngestionAdapter(CONFIG).ingest(aPdf()),
    ).rejects.toThrow(DocumentIngestionFailedError);
  });
});
