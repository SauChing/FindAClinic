export interface Clinic {
  id: string;
  name: string;
  address: string;
  postalCode: string;
  phone: string;
  programmes: string[];
  lat: number;
  lng: number;
  licenceType: string;
  distanceMeters?: number;
  distanceFormatted?: string;
}

export interface UserCoordinates {
  lat: number;
  lng: number;
  accuracy?: number;
  label?: string;
}

export interface SingaporeStation {
  name: string;
  line: string;
  lat: number;
  lng: number;
}

export interface SingaporeArea {
  name: string;
  region: string;
  lat: number;
  lng: number;
}
