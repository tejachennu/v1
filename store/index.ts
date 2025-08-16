import { configureStore } from "@reduxjs/toolkit"
import chatReducer from "./slices/chatSlice"

export const store = configureStore({
  reducer: {
    chat: chatReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["chat/addMessage"],
        ignoredPaths: ["chat.conversations.*.messages.*.timestamp"],
      },
    }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
