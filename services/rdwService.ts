
export interface RDWVehicleData {
  make: string;
  model: string;
  year: number;
  fuelType: string;
  apkDate: string;
}

const RDW_BASE_URL = 'https://opendata.rdw.nl/resource/m9d7-ebf2.json';
const RDW_FUEL_URL = 'https://opendata.rdw.nl/resource/8ys7-d773.json';

export const fetchCarDataByLicensePlate = async (licensePlate: string): Promise<RDWVehicleData | null> => {
  try {
    // Clean license plate (remove dashes, spaces, make uppercase)
    const cleanPlate = licensePlate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    if (cleanPlate.length < 6) return null;

    // 1. Fetch Basic Vehicle Info
    const vehicleResponse = await fetch(`${RDW_BASE_URL}?kenteken=${cleanPlate}`);
    if (!vehicleResponse.ok) return null;
    
    const vehicleData = await vehicleResponse.json();

    if (!vehicleData || vehicleData.length === 0) {
      // Return null silently if not found, let UI handle the error message
      return null;
    }

    const info = vehicleData[0];

    // 2. Fetch Fuel Info (Separate endpoint in RDW)
    let fuelType = 'Benzine'; // Default fallback
    
    try {
        const fuelResponse = await fetch(`${RDW_FUEL_URL}?kenteken=${cleanPlate}`);
        if (fuelResponse.ok) {
            const fuelData = await fuelResponse.json();
            if (fuelData && fuelData.length > 0) {
              const types = fuelData.map((f: any) => f.brandstof_omschrijving).filter(Boolean);
              
              if (types.includes('Elektriciteit') && (types.includes('Benzine') || types.includes('Diesel'))) {
                fuelType = 'Hybride';
              } else if (types.length > 0) {
                // Capitalize first letter
                fuelType = types[0].charAt(0).toUpperCase() + types[0].slice(1).toLowerCase();
              }
            }
        }
    } catch (e) {
        // Ignore fuel fetch errors, fallback to Benzine or whatever we have
        console.warn("Could not fetch fuel type details", e);
    }

    // Format date (RDW returns YYYYMMDD usually, or full string)
    let year = new Date().getFullYear();
    if (info.datum_eerste_toelating) {
        const y = info.datum_eerste_toelating.substring(0, 4);
        year = parseInt(y);
    }

    // Format APK Date
    let apkDate = '';
    if (info.vervaldatum_apk) {
        // RDW often returns YYYYMMDD
        const rawApk = info.vervaldatum_apk;
        if (rawApk.length === 8 && !rawApk.includes('-')) {
             apkDate = `${rawApk.substring(0, 4)}-${rawApk.substring(4, 6)}-${rawApk.substring(6, 8)}`;
        } else {
             // Sometimes returns standard date string
             apkDate = rawApk; 
        }
    }

    return {
      make: info.merk || '',
      model: info.handelsbenaming || '',
      year: year,
      fuelType: fuelType,
      apkDate: apkDate
    };

  } catch (error) {
    console.error("RDW Service error:", error);
    return null;
  }
};