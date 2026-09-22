/**
 * Organize has no options panel on purpose.
 *
 * Every instruction it takes comes from the page grid: `ToolPage` builds `operations` from
 * the grid's page list and overwrites whatever is in the options object. A control here
 * would be discarded on run, which is exactly what the old "add blank page" button did.
 * The grid's own control is the real one.
 */
export default function OrganizeOptionsPanel() {
  return null
}
