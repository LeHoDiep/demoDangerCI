import chokidar from 'chokidar'
import simpleGit from 'simple-git'

export const trackingAutoPush = ({
  directoryToWatch,
  childRepoPath
}: {
  directoryToWatch: string
  childRepoPath: string
}) => {
  const git = simpleGit(childRepoPath)
  chokidar.watch(directoryToWatch).on('change', (event, path) => {
    console.log(`File ${path} đã thay đổi.`)

    // Thực hiện commit và push code lên remote repo

    git
      .add('.')
      .commit(`ChangeType: ${new Date().toISOString()}`)
      .push(['origin', 'main'], () => console.log(`Code đã được push lên remote repo.`))
      .catch((err) => console.log('autopush: ' + err))
  })

  console.log(`following ${directoryToWatch} to auto push to ${childRepoPath}...`)
}
