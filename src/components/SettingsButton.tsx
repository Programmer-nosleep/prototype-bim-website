import * as BUI from '@thatopen/ui';

interface SettingsButtonProps {
  panelSelector?: string;
  className?: string;
}

export const SettingsButton = (props: SettingsButtonProps) => {
  const { panelSelector = '.options-panel', className = '' } = props;

  const onClick = () => {
    const panel = document.querySelector(panelSelector);
    if (panel) {
      panel.classList.toggle('options-menu-visible');
    }
  };

  return BUI.Component.create<BUI.PanelSection>(() => {
    return BUI.html`
      <bim-button 
        class="phone-menu-toggler ${className}" 
        icon="solar:settings-bold"
        @click=${onClick}>
      </bim-button>
    `;
  });
};

export default SettingsButton;
