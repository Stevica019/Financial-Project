// Opens a workspace page, then optionally a tab inside its section, such as Settings › Categories.
// Settings is not in the mobile bottom bar, so pages missing from the bar open from the user menu.
export async function navigateWorkspace(page, name, section) {
  const navigation = page.getByRole('navigation', { name: 'Workspace' })
  // A closing dialog keeps the page aria-hidden for a moment; wait so the visibility check below is reliable.
  await navigation.waitFor()
  const link = navigation.getByRole('link', { name, exact: true })
  if (await link.isVisible()) await link.click()
  else {
    await page.getByRole('button', { name: 'User menu' }).click()
    await page.getByRole('menuitem', { name, exact: true }).click()
  }
  if (section) await page.getByRole('navigation', { name: `${name} sections` }).getByRole('link', { name: section, exact: true }).click()
}
