import { Fragment } from 'react';
import { Typography } from '@mui/material';
import { AssistantRecord } from '../../models/owns/assistant';
import RecordCard from './RecordCard';

const RECORD_TOKEN = /\[\[(asset|work_order):(\d+)]]/g;

/**
 * Renders an assistant reply. [[asset:ID]] and [[work_order:ID]] tokens become clickable record cards.
 */
export default function MessageText({
  text,
  records,
  error
}: {
  text: string;
  records: Record<string, AssistantRecord>;
  error?: boolean;
}) {
  const pieces: { text?: string; record?: AssistantRecord }[] = [];
  let lastIndex = 0;
  for (const match of Array.from(text.matchAll(RECORD_TOKEN))) {
    pieces.push({ text: text.slice(lastIndex, match.index) });
    const record = records[`${match[1]}:${match[2]}`];
    if (record) pieces.push({ record });
    lastIndex = (match.index ?? 0) + match[0].length;
  }
  pieces.push({ text: text.slice(lastIndex) });

  return (
    <>
      {pieces.map((piece, index) => {
        if (piece.record)
          return (
            <RecordCard
              key={`${piece.record.type}-${piece.record.id}-${index}`}
              record={piece.record}
            />
          );
        const trimmed = piece.text?.replace(/^\s*\n|\n\s*$/g, '').trimEnd();
        if (!trimmed) return <Fragment key={index} />;
        return (
          <Typography
            key={index}
            variant="body1"
            color={error ? 'error' : undefined}
            sx={{ whiteSpace: 'pre-wrap' }}
          >
            {trimmed}
          </Typography>
        );
      })}
    </>
  );
}
