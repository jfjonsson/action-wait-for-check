import {GitHub} from '@actions/github/lib/utils'
import {wait} from './wait'

export interface Options {
  client: InstanceType<typeof GitHub>
  log: (message: string) => void

  checkName: string
  timeoutSeconds: number
  intervalSeconds: number
  owner: string
  repo: string
  ref: string
}

export const poll = async (options: Options): Promise<string> => {
  const {
    client,
    log,
    checkName,
    timeoutSeconds,
    intervalSeconds,
    owner,
    repo,
    ref
  } = options

  let now = new Date().getTime()
  const deadline = now + timeoutSeconds * 1000

  while (now <= deadline) {
    log(`Retrieving check runs on ${owner}/${repo}@${ref}...`)

    const result = await client.rest.checks.listForRef({
      owner,
      repo,
      ref
    })

    log(`Retrieved ${result.data.check_runs.length} check runs`)

    log(`Check runs: ${result.data.check_runs.map(run => run.name).join(', ')}`)

    const completedCheck = result.data.check_runs.find(
      checkRun => checkRun.status === 'completed' && checkRun.name === checkName
    )

    if (completedCheck) {
      log(
        `Found a completed check with id ${completedCheck.id}, name ${completedCheck.name} and conclusion ${completedCheck.conclusion}`
      )
      // conclusion is only `null` if status is not `completed`.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return completedCheck.conclusion!
    }

    log(
      `No completed checks named ${checkName}, waiting for ${intervalSeconds} seconds...`
    )
    await wait(intervalSeconds * 1000)

    now = new Date().getTime()
  }

  log(
    `No completed checks after ${timeoutSeconds} seconds, exiting with conclusion 'timed_out'`
  )
  return 'timed_out'
}
