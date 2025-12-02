
export const fetchCarImage = async (make: string, model: string, year: number): Promise<string | null> => {
  try {
    // Imagin.studio API (Demo endpoint)
    // We normaliseren de input om de kans op een match te vergroten
    const cleanMake = make.trim();
    // Pak alleen het eerste woord van het model (bijv. "Golf Variant" -> "Golf") voor betere matches
    const cleanModel = model.trim().split(' ')[0]; 
    
    const url = `https://cdn.imagin.studio/getimage?customer=img&make=${encodeURIComponent(cleanMake)}&modelFamily=${encodeURIComponent(cleanModel)}&modelYear=${year}&angle=23&zoomType=fullscreen&width=800`;
    
    // Check of de afbeelding bestaat via een snelle netwerk request
    const response = await fetch(url);
    if (response.ok && response.headers.get('content-type')?.includes('image')) {
        return url;
    }
    return null;
  } catch (error) {
    console.warn("Kon geen afbeelding ophalen:", error);
    return null;
  }
};
