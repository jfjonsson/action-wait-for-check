import {poll} from '../src/poll'

const client = {
  rest: {
    checks: {
      listForRef: jest.fn()
    }
  }
}

const run = () =>
  poll({
    client: client as any,
    log: () => {},
    checkName: 'test',
    owner: 'testOrg',
    repo: 'testRepo',
    ref: 'abcd',
    timeoutSeconds: 3,
    intervalSeconds: 0.1
  })

test('returns conclusion of completed check', async () => {
  client.rest.checks.listForRef.mockResolvedValue({
    data: {
      check_runs: [
        {
          id: '1',
          status: 'pending',
          name: 'test'
        },
        {
          id: '2',
          status: 'completed',
          conclusion: 'success',
          name: 'test'
        }
      ]
    }
  })

  const result = await run()

  expect(result).toBe('success')
  expect(client.rest.checks.listForRef).toHaveBeenCalledWith({
    owner: 'testOrg',
    repo: 'testRepo',
    ref: 'abcd'
  })
})

test('polls until check is completed', async () => {
  client.rest.checks.listForRef
    .mockResolvedValueOnce({
      data: {
        check_runs: [
          {
            id: '1',
            status: 'pending',
            name: 'test'
          }
        ]
      }
    })
    .mockResolvedValueOnce({
      data: {
        check_runs: [
          {
            id: '1',
            status: 'pending',
            name: 'test'
          }
        ]
      }
    })
    .mockResolvedValueOnce({
      data: {
        check_runs: [
          {
            id: '1',
            status: 'completed',
            conclusion: 'failure',
            name: 'test'
          }
        ]
      }
    })

  const result = await run()

  expect(result).toBe('failure')
  expect(client.rest.checks.listForRef).toHaveBeenCalledTimes(3)
})

test(`returns 'timed_out' if exceeding deadline`, async () => {
  client.rest.checks.listForRef.mockResolvedValue({
    data: {
      check_runs: [
        {
          id: '1',
          status: 'pending',
          name: 'test'
        }
      ]
    }
  })

  const result = await run()
  expect(result).toBe('timed_out')
})
