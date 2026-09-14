import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { kanbanService } from "./index";
import type { Board, CardStatus, Slot } from "./types";

export const boardKey = ["board"] as const;

export const boardQueryOptions = queryOptions<Board>({
  queryKey: boardKey,
  queryFn: () => kanbanService.getBoard(),
});

function useBoardMutation<TInput>(fn: (input: TInput) => Promise<unknown>, errorTitle: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: boardKey }),
    onError: (error: Error) => toast.error(errorTitle, { description: error.message }),
  });
}

export const useCreateProject = () =>
  useBoardMutation(
    (input: { name: string }) => kanbanService.createProject(input),
    "Could not create project",
  );

export const useRenameProject = () =>
  useBoardMutation(
    (input: { id: string; name: string }) => kanbanService.renameProject(input),
    "Could not rename project",
  );

export const useDeleteProject = () =>
  useBoardMutation(
    (input: { id: string }) => kanbanService.deleteProject(input),
    "Could not delete project",
  );

export const useCreateCard = () =>
  useBoardMutation(
    (input: { projectId: string; title: string }) => kanbanService.createCard(input),
    "Could not create card",
  );

export const useUpdateCard = () =>
  useBoardMutation(
    (input: { id: string; title?: string; status?: CardStatus }) =>
      kanbanService.updateCard(input),
    "Could not update card",
  );

export const useDeleteCard = () =>
  useBoardMutation(
    (input: { id: string }) => kanbanService.deleteCard(input),
    "Could not delete card",
  );

export const useMapCard = () =>
  useBoardMutation(
    (input: { id: string; slot: Slot | null }) => kanbanService.mapCard(input),
    "Could not move card",
  );

export const useSetMondayDate = () =>
  useBoardMutation(
    (input: { mondayDate: string | null }) => kanbanService.setMondayDate(input),
    "Could not save week start",
  );
