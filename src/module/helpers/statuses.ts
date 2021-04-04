import { HelperData } from "./commons";

export function heat_display(title: string, heat: number, _helper: HelperData): string {
  if (heat) {
    return `
            <div class="lancer-dice-total flexrow">
                <span style="text-align: left; margin-left: 5px;">${title}</span>
                <span class="dice-total lancer-dice-total major">${heat}</span>
                <i class="cci cci-heat i--m damage--heat"> </i>
            </div>`;
  } else {
    return "";
  }
}
