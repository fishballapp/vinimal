import { STOPPED_COPY, type StoppedReason } from '../../licence/stopped';
import { brand, openDialog } from './dialog';

/** The dialog that the keys have stopped, with the way to the Licence page. */
export const showNotice = ({
  reason,
  onOpenLicence,
  onClose,
}: {
  reason: StoppedReason;
  onOpenLicence: () => void;
  onClose: () => void;
}) => {
  const { title, body } = STOPPED_COPY[reason];
  const heading = document.createElement('p');
  heading.className = 'notice-title';
  heading.textContent = title;
  const text = document.createElement('p');
  text.className = 'notice-body';
  text.textContent = body;
  const open = document.createElement('button');
  open.className = 'primary';
  open.textContent = 'Licence';
  const dismiss = document.createElement('button');
  dismiss.className = 'quiet';
  dismiss.textContent = 'Not now';
  const actions = document.createElement('div');
  actions.className = 'notice-actions';
  actions.append(open, dismiss);

  const dialog = openDialog({
    className: 'notice',
    label: title,
    content: [brand(), heading, text, actions],
    onClose,
  });
  open.addEventListener('click', () => {
    onOpenLicence();
    dialog.close();
  });
  dismiss.addEventListener('click', () => dialog.close());
  dialog.focus(open);
  return dialog;
};
