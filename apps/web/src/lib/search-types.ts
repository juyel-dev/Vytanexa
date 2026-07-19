import type { Json } from '@vytanexa/database';

export type SearchDoctorResult = {
  id: string;
  slug: string;
  name_translations: Json;
  photo_url: string | null;
  categories: { name_translations: Json } | null;
};
export type SearchHospitalResult = {
  id: string;
  slug: string;
  name_translations: Json;
  type: string;
};
export type SearchCategoryResult = { id: string; slug: string; name_translations: Json };
export type SearchSymptomResult = { id: string; slug: string; title_translations: Json };

export type SearchApiResponse = {
  doctors: SearchDoctorResult[];
  hospitals: SearchHospitalResult[];
  categories: SearchCategoryResult[];
  symptoms: SearchSymptomResult[];
};

export type TrendingApiResponse = {
  trending: { query: string; search_count: number }[];
  categories: SearchCategoryResult[];
};
