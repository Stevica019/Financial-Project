export async function navigateWorkspace(page, name) {
  const navigation = page.getByRole('navigation', { name: 'Workspace' })
  const link = navigation.getByRole('link', { name, exact: true })
  if (await link.isVisible()) {
    await link.click()
    return
  }
  await navigation.getByRole('button', { name: /^(Menu|More)$/ }).click()
  await page.getByRole('menuitem', { name, exact: true }).click()
}
