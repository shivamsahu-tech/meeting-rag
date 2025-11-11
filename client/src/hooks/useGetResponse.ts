import { useState, useCallback } from 'react';
type TranscriptChunk = {
  start_time: number | string;
  text: string;
  is_final: boolean;
};

type Transcript = {
  role: "user" | "assistant";
  texts: TranscriptChunk[];
};

interface LLMChat {
  role: 'user' | 'llm';
  content: string;
}

interface WebResult {
  title: string;
  link: string;
  snippet?: string;
}

interface DocResult {
  pdf_url: string | URL;
  page_image_url: any;
  ocr_text_excerpt: any;
  page_number: any;
  content: string;
  source: string;
  page?: number;
}

interface GetResponseParams {
  transcripts: Transcript[];
  isWebSearchActive: boolean;
  isDocSearchActive: boolean;
  userQuery: string;
}

interface GetResponseReturn {
  llmChats: LLMChat[];
  webResults: WebResult[];
  docResults: DocResult[];
  isLoading: boolean;
  error: string | null;
  getResponse: (params: GetResponseParams) => Promise<void>;
  clearError: () => void;
}

export const useGetResponse = (): GetResponseReturn => {
  const [llmChats, setLlmChats] = useState<LLMChat[]>([]);
  const [webResults, setWebResults] = useState<WebResult[]>([]);
  const [docResults, setDocResults] = useState<DocResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const getResponse = useCallback(async (params: GetResponseParams) => {
    const { transcripts, isWebSearchActive, isDocSearchActive, userQuery } = params;

    setIsLoading(true);
    setError(null);

    try {
      // Get index names from localStorage
      const indexNamePdf = localStorage.getItem('index_name_pdf') || '';
      const indexNameOcr = localStorage.getItem('index_name_ocr') || '';

      // Prepare conversations array from transcripts
      const conversations = transcripts.map(t => ({
        role: t.role,
        text: t.texts.filter(chunk => chunk.is_final).map(chunk => chunk.text).join(' '),
      }));

      // Make POST request to server
      const response = await fetch('http://localhost:8000/retrieve-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          index_name_pdf: indexNamePdf,
          index_name_ocr: indexNameOcr,
          conversations: conversations,
          query: userQuery,
          isWebSearchOn: isWebSearchActive,
          isDocSearchOn: isDocSearchActive,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

    console.log('Response data:', data);
    console.log('llm response:', data.data?.llm_response);

    if (userQuery.trim()) {
    setLlmChats(prev => [
        ...prev,
        { role: 'user', content: userQuery },
    ]);
    }

    if (data.data?.llm_response) {
    setLlmChats(prev => [
        ...prev,
        { role: 'llm', content: data.data.llm_response },
    ]);
    }

      // Update web results
    if (data.data?.web_results && Array.isArray(data.data.web_results)) {
    setWebResults(prev => [...prev, ...data.data.web_results]);
    }

    // Update document results
    if (data.data?.document_context && Array.isArray(data.data.document_context)) {
    setDocResults(prev => [...prev, ...data.data.document_context]);
    }


    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get response';
      setError(errorMessage);
      console.error('Error fetching response:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    llmChats,
    webResults,
    docResults,
    isLoading,
    error,
    getResponse,
    clearError,
  };
};