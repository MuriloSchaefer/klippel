import { createAction } from '@reduxjs/toolkit';

export const pushContainer = createAction(
  '[Pointer:Command] PushContainer',
  (id: string) => ({ payload: { id } })
);

export const popContainer = createAction(
  '[Pointer:Command] PopContainer',
  (id: string) => ({ payload: { id } })
);

export const focusContainer = createAction(
  '[Pointer:Command] FocusContainer',
  (id: string) => ({ payload: { id } })
);
