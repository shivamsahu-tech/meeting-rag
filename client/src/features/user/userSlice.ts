import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UserState {
  name: string;
  email: string;
  index_name_ocr: string;
  index_name_pdf: string;
  isLoading: boolean;
  error: string | null;
}

const initialState: UserState = {
  name: '',
  email: '',
  index_name_ocr: '',
  index_name_pdf: '',
  isLoading: false,
  error: null,
};

interface SetUserDetailsPayload {
  name?: string;
  email?: string;
  index_name_ocr?: string;
  index_name_pdf?: string;
}

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUserDetails: (state, action: PayloadAction<SetUserDetailsPayload>) => {
      if (action.payload.name !== undefined) state.name = action.payload.name;
      if (action.payload.email !== undefined) state.email = action.payload.email;
      if (action.payload.index_name_ocr !== undefined) state.index_name_ocr = action.payload.index_name_ocr;
      if (action.payload.index_name_pdf !== undefined) state.index_name_pdf = action.payload.index_name_pdf;
      console.log('User details updated in state:', state);
    },
    clearUser: (state) => {
      state.name = '';
      state.email = '';
      state.index_name_ocr = '';
      state.index_name_pdf = '';
    },
  },
});

export const { setUserDetails, clearUser } = userSlice.actions;

export default userSlice.reducer;