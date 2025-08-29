import { Message } from '../types';

interface WebContent {
  url: string;
  content: string;
  timestamp: string;
}

// Storage key for saved URLs and their content
const RAG_STORAGE_KEY = 'daredevil_rag_data';

// Function to fetch content from a URL
export const fetchUrlContent = async (url: string): Promise<string> => {
  try {
    // In a real implementation, we would use a proxy server or API to fetch the content
    // For now, we'll use a CORS proxy to avoid CORS issues in the browser
    const corsProxy = 'https://corsproxy.io/?';
    const response = await fetch(`${corsProxy}${encodeURIComponent(url)}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // Extract text content from HTML (basic implementation)
    // In a production environment, you'd want to use a proper HTML parser
    const textContent = extractTextFromHtml(html);
    
    return textContent;
  } catch (error) {
    console.error('Error fetching URL content:', error);
    throw error;
  }
};

// Basic function to extract text from HTML
const extractTextFromHtml = (html: string): string => {
  // Remove scripts, styles, and HTML tags
  const withoutScripts = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
  const withoutStyles = withoutScripts.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
  const withoutTags = withoutStyles.replace(/<[^>]*>/g, ' ');
  
  // Decode HTML entities
  const decoded = withoutTags.replace(/&[#A-Za-z0-9]+;/g, ' ');
  
  // Remove extra whitespace
  const cleaned = decoded.replace(/\s+/g, ' ').trim();
  
  // Limit the length to avoid overwhelming the LLM
  return cleaned.substring(0, 5000);
};

// Function to save URL content to localStorage
export const saveUrlContent = (url: string, content: string): void => {
  try {
    // Get existing RAG data
    const existingData = getStoredRagData();
    
    // Add or update the URL content
    const newData = {
      ...existingData,
      [url]: {
        url,
        content,
        timestamp: new Date().toISOString()
      }
    };
    
    // Save back to localStorage
    localStorage.setItem(RAG_STORAGE_KEY, JSON.stringify(newData));
  } catch (error) {
    console.error('Error saving URL content:', error);
  }
};

// Function to get all stored RAG data
export const getStoredRagData = (): Record<string, WebContent> => {
  try {
    const data = localStorage.getItem(RAG_STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Error getting stored RAG data:', error);
    return {};
  }
};

// Function to remove a URL from the RAG data
export const removeRagUrl = (url: string): void => {
  try {
    const existingData = getStoredRagData();
    
    if (existingData[url]) {
      delete existingData[url];
      localStorage.setItem(RAG_STORAGE_KEY, JSON.stringify(existingData));
    }
  } catch (error) {
    console.error('Error removing URL from RAG data:', error);
  }
};

// Function to get all URLs as an array
export const getStoredUrls = (): string[] => {
  const data = getStoredRagData();
  return Object.keys(data);
};

// Function to process a text file containing URLs
export const processUrlsFromText = async (text: string): Promise<{
  successful: string[];
  failed: string[];
}> => {
  const results = {
    successful: [] as string[],
    failed: [] as string[]
  };
  
  // Extract URLs from the text (one per line)
  const urls = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  // Process each URL
  for (const urlRaw of urls) {
    try {
      // Normalize URL (add https:// if missing)
      let url = urlRaw;
      if (!url.startsWith('http')) {
        url = `https://${url}`;
      }
      
      // Fetch and process the URL content
      const content = await fetchUrlContent(url);
      
      // Save the URL content
      saveUrlContent(url, content);
      
      // Add to successful list
      results.successful.push(url);
    } catch (error) {
      console.error(`Error processing URL ${urlRaw}:`, error);
      results.failed.push(urlRaw);
    }
  }
  
  return results;
};

// Function to create context from stored RAG data
export const createRagContext = (query: string): string => {
  try {
    const data = getStoredRagData();
    
    if (Object.keys(data).length === 0) {
      return '';
    }
    
    // Combine all content into a single context string
    // In a real implementation, you'd want to use semantic search or embeddings
    // to find the most relevant content for the query
    let context = 'Information from provided sources:\n\n';
    
    Object.values(data).forEach((item) => {
      // Add a snippet of content from each URL (limit to 500 chars per URL)
      context += `From ${item.url}:\n${item.content.substring(0, 500)}...\n\n`;
    });
    
    return context;
  } catch (error) {
    console.error('Error creating RAG context:', error);
    return '';
  }
}; 