import { Alert } from '@mui/material';

export default function FeatureErrorMessage({ message }: { message: string }) {
  return <Alert severity="info">This feature is unavailable. Check your permissions and configuration.</Alert>;
}
