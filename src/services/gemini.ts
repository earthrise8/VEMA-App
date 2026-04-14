const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export async function analyzeHealthScan(images: string[], description: string, medicalHistory: string) {
  try {
    const response = await fetch(`${apiBaseUrl}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        images,
        description,
        medicalHistory,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      const message = errorBody?.error || `Gemini request failed with status ${response.status}`;
      throw new Error(message);
    }

    const data = await response.json();
    return data.text || 'AI analysis returned no content.';
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "AI analysis failed. Please consult a healthcare professional directly.";
  }
}
