export interface CategoryInput {
  name: string;
  description?: string;
}

export interface Category extends CategoryInput {
  _id: string;
}
