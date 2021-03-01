import { ActivationType, DamageType, RangeType, WeaponSize, WeaponType } from "machine-mind";
import { gentle_merge, read_form, resolve_dotpath } from "../helpers/commons";

/**
 * A helper Dialog subclass for editing an item, using the same general semantics as
 * the HANDLER style methods. Provide it with the object you wish to edit, as well as 
 * 
 * @extends {Dialog}
 */
export class GenericEditDialogue<O> extends Dialog {
  // The item we're editing. Any "name" attributes will be resolved against this item
  target: O;

  // The form to show
  form_text: string;

  constructor(target: O, form_text: string, dialogData: DialogData  = {}, options: ApplicationOptions = {}) {
    super(dialogData, options);
    this.target = target;
    this.form_text = form_text;
  }

  /* -------------------------------------------- */

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      // template: "systems/lancer/templates/window/action.html",
      width: 400,
      height: "auto",
      classes: ["lancer"]
    });
  }

  /** Override to just show our provided form */
  async _renderInner() {
    return $(`<form class="lancer-sheet" onsubmit="event.preventDefault();">
      <div class="flexcol">
        ${this.form_text}

        <div class="dialog-buttons flexrow">
          <button class="dialog-button" data-button="confirm">Save</button>
          <button class="dialog-button" data-button="cancel">Cancel</button>
        </div>
      </div>
    </form>`);
  }

  /* -------------------------------------------- */

  /**
   * A helper constructor function which displays the given text editor and returns a Promise that resolves once the 
   * workflow has been resolved. The item will have been edited in place, based on the result of merging the form data into
   * the item. The promise will return the same item it was given.
   * 
   * Rejects if the user cancels the workflow without saving
   * @return {Promise}
   */
  static async render_form<T>(in_object: T, form_text: string, save_on_close: boolean = true): Promise<T> {
    return new Promise((resolve, reject) => {
      // We call this if we want to save
      const succeed = (html: HTMLElement | JQuery<HTMLElement>) => {
          // Collect into an update object
          let flat_data = read_form($(html).find("form").addBack("form")[0]);

          // Do the merge
          console.log("Editor merging in the following data", flat_data, "to", in_object);
          gentle_merge(in_object, flat_data);
          resolve(in_object);
      };

      const dlg = new this(in_object, form_text, {
        title: "Edit",
        buttons: {
          confirm: {
            icon: '<i class="fas fa-save"></i>',
            label: "Save",
            callback: succeed
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel",
            callback: reject
          }
        },
        default: 'confirm',
        close: html => {
          if(save_on_close) {
            succeed(html);
          } else {
            reject();
          }
        }
      });
      dlg.render(true);
    });
  }
}
