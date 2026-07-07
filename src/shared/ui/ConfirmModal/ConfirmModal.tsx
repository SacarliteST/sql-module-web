import { Button, Group, Modal, Text } from '@mantine/core';

type ConfirmModalProps = {
  opened: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmModal({
  cancelLabel = 'Отмена',
  confirmLabel = 'Удалить',
  loading = false,
  message,
  onCancel,
  onConfirm,
  opened,
  title,
}: ConfirmModalProps) {
  return (
    <Modal centered opened={opened} title={title} onClose={onCancel}>
      <Text size="sm">{message}</Text>
      <Group justify="flex-end" mt="lg">
        <Button variant="default" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button color="red" loading={loading} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </Group>
    </Modal>
  );
}
