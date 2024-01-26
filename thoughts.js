import { SIZES, addToOrderedBranches, orderedBranches, states, edges, settings, addResourseNode, colors, addNode, addEdge, thoughts } from './graph.js'

import {
    getVectorCoordinates
} from './misc.js'

const THOUGHT_EDGE_DISTANCE = 80

function getThoughtDateRange() {
    let start
    let end

    if (settings.focusMode) {
        start = new Date(new Date().setMonth(new Date().getMonth() - 1))
        end = new Date()
    } else {
        start = settings.date
        end = new Date(
            new Date(settings.date).setMonth(settings.date.getMonth() + 1)
        )
    }

    return { start, end }
}

export function filterThoughts() {

    const dateRange = getThoughtDateRange()

    let filteredThoughts = thoughts.filter((thought) => {
        thought.isResolved = thought.states[thought.states.length - 1].state === 'Отпущена'

        if (thought.isResolved) {
            return (false)
        }

        let thoughtOk = true
        for (let state of thought.states) {
            if (state.date > dateRange.end || state.date < dateRange.start) {
                thoughtOk = false
                break
            }
        }

        return (thoughtOk)
    })

    return filteredThoughts

}

export function addUserThoughts(partner, dealId, branchId, level = 0) {

    level++

    const outerNodeId = 'outer_' + branchId

    const prevThoughtEdges = edges.get({
        filter: function (edge) {
            return (edge.branchId == branchId)
        },
    })

    prevThoughtEdges.forEach((edge) => {
        edges.remove(edge.id)
    })

    let prevThoughtId
    let thoughtsToShow = []

    thoughts.forEach(thought => {

        if (!(thought.author.id == settings.userDrawnId && thought.partner.id == partner.id)) {
            return
        }

        if (thought.branchId && thought.branchId !== branchId) {
            return
        }

        if (thought.dealId && thought.dealId !== dealId) {
            return
        }

        thought.states.forEach((state, absStateCount) => {

            if (thought.id != prevThoughtId) {
                prevThoughtId = thought.id
                // newThought = { image: thought.image, description: thought.description, id: thought.id, isResolved: thought.isResolved, states: [] }
                thoughtsToShow.push(thought)
            }

            state.absStateCount = absStateCount
            // newThought.states.push({ absStateCount, ...state })

        })
    })

    let parentThoughtNode = outerNodeId

    if (thoughtsToShow.length >= 2) {
        parentThoughtNode = 'thoughtOutlet_' + branchId
        const color = colors.mainGreen
        addNode({ id: parentThoughtNode, label: 'Мысли', color, shape: 'circle', size: 100, subType: 'thoughtOutlet', branchId, parentNodeId: outerNodeId, level })
        addEdge({ id1: parentThoughtNode, id2: outerNodeId, branchId })
        level++
    }

    thoughtsToShow.forEach((thought, thoughtCount) => {

        let prevNode = parentThoughtNode
        let stateCount = 0
        let lastThoughtType

        thought.branchId = branchId

        thought.states.forEach((state) => {

            const thoughtStateNodeId = 'thought_' + thought.id + '_' + state.absStateCount.toString()
            stateCount++

            lastThoughtType = state.type

            addThoughtStateNode(thoughtStateNodeId, state, thought, { stateCount, absStateCount: state.absStateCount, thoughtCount, parentNodeId: parentThoughtNode, level })
            level++
            addEdge({ id1: prevNode, id2: thoughtStateNodeId, parentNodeId: outerNodeId, length: THOUGHT_EDGE_DISTANCE, branchId })
            prevNode = thoughtStateNodeId
        })

        addNode({
            id: 'addThoughtState_' + thought.id, label: '+', shape: 'circle', branchId, color: colors.addThoughtColor, size: 40, fontSize: 24, level,
            subType: 'addThoughtState', thoughtName: thought.description, lastThoughtType, thoughtId: thought.id, parentThoughtNode, parentNodeId: prevNode, partnerId: partner.id
        })
        addEdge({ id1: prevNode, id2: 'addThoughtState_' + thought.id, length: -300, parentNodeId: outerNodeId, branchId })
        level++

    })

    addNode({
        id: 'addThought_' + outerNodeId, label: '+', shape: 'circle', color: colors.addThoughtColor, size: 40, fontSize: 24, subType: 'addThought',
        parentNodeId: parentThoughtNode, branchId, partnerId: partner.id, level
    })
    level++

    addEdge({ id1: parentThoughtNode, id2: 'addThought_' + outerNodeId, length: -300, branchId })

}

export function addPartnerThoughts(partner, innerNodeId, branchId, dealId, dealsOnly = false) {

    let thoughtCount = 1

    thoughts.forEach(thought => {

        if (!(thought.author.id == partner.id && thought.partner.id == settings.userDrawnId)) {
            return
        }

        if (thought.branchId && thought.branchId !== branchId) {
            return
        }

        if (thought.dealId && thought.dealId !== dealId) {
            return
        }

        if (dealsOnly && !thought.dealId) {
            return
        }

        addThought(thought, innerNodeId)

    })

    function addThought(thought, nodeId) {

        let prevNode = nodeId
        let stateCount = 0

        thought.branchId = branchId

        thought.states.forEach((state, absStateCount) => {

            const thoughtNodeId = 'thought_' + thought.id + '_' + absStateCount.toString()

            state.forceDisplay = true
            stateCount++

            addThoughtStateNode(thoughtNodeId, state, thought, { branchId, stateCount, absStateCount, thoughtCount, parentNodeId: nodeId })
            addEdge({ id1: prevNode, id2: thoughtNodeId, parentNodeId: nodeId, length: THOUGHT_EDGE_DISTANCE })
            prevNode = thoughtNodeId
        })
        thoughtCount++
    }


}


function addThoughtStateNode(thoughtNodeId, state, thought, additionalParams) {

    let label

    if (thought.image) {
        label = new Date(state.date).toLocaleString('ru-RU', { month: 'long', year: 'numeric', day: "numeric" })
        label = label.replace("г.", '')
    } else {
        label = new Date(state.date).toLocaleString('ru-RU', { month: 'long', day: "numeric" }) +
            '\n[' + state.state + ']' +
            '\n' + thought.description
    }
    const thoughtColor = state.type == 'bad' ? colors.mainRed : colors.mainGreen

    if (thought.image) {
        addNode({ id: thoughtNodeId, color: thoughtColor, label, image: thought.image, shape: 'image', imageSize: SIZES.THOUGHT_IMAGE, subType: 'thought', thoughtId: thought.id, ...additionalParams })
    }
    else {
        addNode({ id: thoughtNodeId, color: thoughtColor, label, shape: 'box', size: SIZES.THOUGHT_BOX, subType: 'thought', thoughtId: thought.id, ...additionalParams })
    }
}

export function addRestThoughts() {

    thoughts.forEach(thought => {

        if (thought.branchId || thought.dealId) {
            return
        }

        let level = 1

        const resourse = (thought.author.id === settings.userDrawnId) ? thought.partner : thought.author
        const branchId = 'res_' + resourse.id
        thought.branchId = branchId

        addToOrderedBranches(branchId, true)
        let newNode = addResourseNode(resourse, 'res_', resourse.id === settings.partnerId, { level, branchId })
        level++

        addEdge({ id1: states.centerNodeId, id2: newNode.id, direction: 'from' })

        const outerNodeId = 'outer_' + branchId
        addNode({ id: outerNodeId, shape: 'dot', color: colors.mainGreen, size: 1, imageSize: 1, thoughtsExpanded: false, subType: 'outer', level, branchId })
        level++
    
        addEdge({ id1: outerNodeId, id2: 'res_' + resourse.id, direction: 'to' })

        addPartnerThoughts(resourse, 'res_' + resourse.id, branchId)
        addUserThoughts(resourse, undefined, branchId, level)

    })



}