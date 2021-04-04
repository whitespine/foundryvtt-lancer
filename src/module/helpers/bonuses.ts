import { Bonus, Damage, Range, DamageType, RangeType, WeaponSize, WeaponType } from "machine-mind";
import { BonusEditDialog } from "../apps/bonus-editor";
import { GenericEditDialogue } from "../apps/generic-editor";
import {
  effect_box,
  ext_helper_hash,
  HelperData,
  inc_if,
  resolve_helper_dotpath,
  std_checkbox,
  std_string_input,
} from "./commons";

/** Expected arguments:
 * - bonus_path=<string path to the individual bonus item>,  ex: ="ent.mm.Bonuses.3"
 * - bonus=<bonus object to pre-populate with>
 */
export function single_bonus_editor(bonus_path: string, helper: HelperData) {
  // Our main two inputs
  let id_input = std_string_input(`${bonus_path}.ID`, ext_helper_hash(helper, { label: "ID" }));
  let val_input = std_string_input(
    `${bonus_path}.Value`,
    ext_helper_hash(helper, { label: "Value" })
  );

  // Icon factories
  const damage_icon = (d: DamageType) => `<i class="i--m ${Damage.icon_for(d)}"> </i>`;
  const range_icon = (d: RangeType) => `<i class="i--m ${Range.icon_for(d)}"> </i>`;

  // Our type options
  let damage_checkboxes: string[] = [];
  for (let dt of Object.values(DamageType)) {
    damage_checkboxes.push(
      std_checkbox(
        `${bonus_path}.DamageTypes.${dt}`,
        ext_helper_hash(helper, { label: damage_icon(dt) })
      )
    );
  }

  let range_checkboxes: string[] = [];
  for (let rt of Object.values(RangeType)) {
    range_checkboxes.push(
      std_checkbox(
        `${bonus_path}.RangeTypes.${rt}`,
        ext_helper_hash(helper, { label: range_icon(rt) })
      )
    );
  }

  let type_checkboxes: string[] = [];
  for (let wt of Object.values(WeaponType)) {
    type_checkboxes.push(
      std_checkbox(`${bonus_path}.WeaponTypes.${wt}`, ext_helper_hash(helper, { label: wt }))
    );
  }

  let size_checkboxes: string[] = [];
  for (let st of Object.values(WeaponSize)) {
    size_checkboxes.push(
      std_checkbox(`${bonus_path}.WeaponSizes.${st}`, ext_helper_hash(helper, { label: st }))
    );
  }

  // Consolidate them into rows
  return `
    <div class="flexcol">
      <span class="lancer-header">INFO</span>
      ${id_input}
      ${val_input}

      <div class="wraprow double">
        <div class="flexcol">
          <span class="lancer-header">DAMAGE TYPES</span>
          ${damage_checkboxes.join(" ")}
        </div>
        <div class="flexcol">
          <span class="lancer-header">RANGES TYPES</span>
          ${range_checkboxes.join(" ")}
        </div>

        <div class="flexcol">
          <span class="lancer-header">WEAPON TYPES</span>
          ${type_checkboxes.join(" ")}
        </div>
        <div class="flexcol">
          <span class="lancer-header">WEAPON SIZES</span>
          ${size_checkboxes.join(" ")}
        </div>
      </div>
    </div>
    `;
}

/** Expected arguments:
 * - bonuses_path=<string path to the bonuses array>,  ex: ="ent.mm.Bonuses"
 * Displays a list of bonuses, with buttons to add/delete (if edit true).
 */
export function bonus_list_display(bonuses_path: string, helper: HelperData): string {
  let items: string[] = [];
  let edit = helper.hash.editable ?? false;
  let bonuses_array = resolve_helper_dotpath<Bonus[]>(helper, bonuses_path);
  if (!bonuses_path) return "err";

  // Render each bonus
  for (let i = 0; i < bonuses_array.length; i++) {
    let bonus = bonuses_array[i];
    let delete_button = `<a class="gen-control fas fa-trash" data-action="splice" data-path="${bonuses_path}.${i}"></a>`;
    let title = `<span class="grow">${bonus.Title}</span> ${inc_if(delete_button, edit)}`;
    let boxed = `
      <div class="bonus ${inc_if("editable", edit)}" data-path="${bonuses_path}.${i}">
        ${effect_box(title, "" + bonus.Detail, helper)}
      </div>
    `;
    items.push(boxed);
  }

  return `
    <div class="card bonus-list">
      <div class="lancer-header">
        <span class="left">// Bonuses</span>
        ${inc_if(
          `<a class="gen-control fas fa-plus" data-action="append" data-path="${bonuses_path}" data-action-value="(struct)bonus"></a>`,
          edit
        )}
      </div>
      ${items.join("\n")}
    </div>
    `;
}

// Allows right clicking bonuses to edit them
export function HANDLER_activate_edit_bonus<T>(
  html: JQuery,
  data_getter: () => Promise<T> | T,
  commit_func: (data: T) => void | Promise<void>
) {
  let bonuses = html.find(".editable.bonus");
  bonuses.on("click", async event => {
    // Find the bonus
    let bonus_path = event.currentTarget.dataset.path;
    if (!bonus_path) return;
    let sheet_data = await data_getter();
    return GenericEditDialogue.render_form(
      sheet_data,
      single_bonus_editor(bonus_path, {
        data: {
          root: sheet_data,
        },
        hash: {},
      })
    )
      .then(data => commit_func(data))
      .catch(e => console.error("Bonus edit cancelled", e));
  });
}
