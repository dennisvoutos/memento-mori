/** Shape returned by the search endpoint for memorial results. */
export interface SearchResult {
  id: string;
  fullName: string;
  dateOfBirth: string;
  dateOfPassing: string;
  biography: string | null;
  profilePhotoUrl: string | null;
  category?: string;
  createdAt: string;
}
