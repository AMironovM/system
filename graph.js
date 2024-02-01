import {
    getJSON,
    postJSON,
    timer,
    getVectorCoordinates,
    getAngle,
    readCookie,
    createCookie,
    eraseCookie,
    getAliasPresentation, log, fitText
} from './misc.js'

import {
    drawTree
} from './ancestory.js'

import {
    filterThoughts, addUserThoughts, addPartnerThoughts, addRestThoughts
} from './thoughts.js'

const fpPromise = import('https://openfpcdn.io/fingerprintjs/v4')
    .then(FingerprintJS => FingerprintJS.load())


let hiddenGroups = []
export let rawGraph
let ancestory = {}
let pairs
let graph
let users = []
let centerDeals
let dateRangeValue = ''
let dateRangeValues = ['']
const totals = { gave: 0, received: 0 }

export let visitorId
export let sessionId
export let localStorageId

sessionId = sessionStorage.getItem("sessionId");

if (!sessionId) {
    sessionId = crypto.randomUUID()
    sessionStorage.setItem("sessionId", sessionId);
}

localStorageId = localStorage.getItem("localStorageId");

if (!localStorageId) {
    localStorageId = crypto.randomUUID()
    localStorage.setItem("localStorageId", localStorageId);
}

fpPromise
    .then(fp => fp.get())
    .then(result => {
        visitorId = result.visitorId
        console.log(visitorId)
    })

const logo = document.querySelector('.logo')
logo.addEventListener('click', onLogoClick)

export const colors = {
    addThoughtColor: 'rgb(250, 250, 214)',
    mainRed: 'rgb(240,180,180)',
    mainGreen: 'rgb(200,240,200)',
    mainYellow: 'rgb(240, 240, 200)',
    mainBlue: 'rgb(200, 200, 240)'
}


export const user = {}
export const settings = {
    focusMode: false,
    useNicknames: false,
    filterByTop: 0,
    userDrawnId: undefined,
    userDrawnName: undefined,
    userImage: undefined,
    date: new Date(),
    partnerId: '',
    addSecondAncestors: false
}

export const states = {
    drawingNow: false,
    ignoreDates: true,
    playbackActive: false,
    forceReset: false,
    center: { x: 0, y: 0 },
    centerNodeId: 'center'
}


let rangeTimer
let orderedResourses = []
export let orderedBranches = []
export let thoughts

const DISTANCE = 600

export const SIZES = {
    NODE_IMAGE: 70,
    NODE_BOX: 140,
    THOUGHT_BOX: 130,
    THOUGHT_IMAGE: 50
}

const statusElement = document.getElementById('status')
const statusText = document.getElementById('statusText')

const usersElement = document.getElementById('users_dropdown')
usersElement.addEventListener('change', onUserChange)

const contrators = document.getElementById('newDealContractor')

const startButton = document.getElementById('startRange')
startButton.addEventListener('click', onStartRange)

const resetButton = document.getElementById('resetRange')
resetButton.addEventListener('click', onResetRange)

const userNameLogo = document.getElementById('userNameLogo')
userNameLogo.addEventListener('click', onResetRange)

const updateThoughtButton = document.getElementById('updateThought')
updateThoughtButton.addEventListener('click', onUpdateThought)

const logoutButton = document.getElementById('logoutButton')
logoutButton.addEventListener('click', onLogout)

document.getElementById('createDeal').addEventListener('click', createNewDeal)

const dateRange = document.getElementById('DateRange')
dateRange.addEventListener('input', onManualDateRangeInput)

const userSelectBlock = document.getElementById('users_select')

const focusToggle = document.getElementById('focus_toggle')
focusToggle.addEventListener('change', onFocusToggle)

let authKey = readCookie('authKey')

export let nodes = new vis.DataSet([])
export let edges = new vis.DataSet([])

let currentNodes = new vis.DataSet([])
let currentEdges = new vis.DataSet([])

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);

const container = document.getElementById('mynetwork')
const options = {
    physics: {
        stabilization: false,
        enabled: true,
        barnesHut: {
            springConstant: 0.01,
            theta: 0.05,
            avoidOverlap: 0.35,
            centralGravity: 0.16,
            damping: 0.3,
        },
        minVelocity: 0.5,
        maxVelocity: 10,
    },
}
const network = new vis.Network(
    container,
    {
        nodes: currentNodes,
        edges: currentEdges,
    },
    options
)

const closeElements = document.getElementsByClassName('close')

Array.from(closeElements).forEach(function (element) {
    element.addEventListener('click', (e) => {
        e.target.parentElement.parentElement.close()
    })
})

const modalElements = document.getElementsByClassName('modal')

Array.from(modalElements).forEach(function (element) {
    element.addEventListener('click', (e) => {
        const dialogDimensions = e.target.getBoundingClientRect()
        if (e.currentTarget != e.target) {
            return
        }
        if (
            e.clientX < dialogDimensions.left ||
            e.clientX > dialogDimensions.right ||
            e.clientY < dialogDimensions.top ||
            e.clientY > dialogDimensions.bottom
        ) {
            e.target.close()
        }
    })
})

resetDropDown()
setLoginVisibility()
getUsers(true)

network.moveTo({
    scale: 0.2, position: { x: 0, y: 0 }
})

network.on('click', preNetworkOnClick)
network.on('doubleClick', networkOnDoubleClick)
network.on('selectNode', onSelectNode)
network.on('deselectNode', deselectNode)

network.on('stabilized', function (params) {
    if (statusText.innerText === 'Симуляция физики') {
        statusText.innerText = ''
        statusElement.classList.add('hidden')
    }
})

setInterval(animateArrows, 125)

function resetDropDown() {
    usersElement.length = 0

    let default_user = new Option('               ', null, true, true)
    default_user.disabled = true
    usersElement.add(default_user)

}


function setLoginVisibility() {
    const tgLogin = document.getElementById('tg-login')
    const logoutBlock = document.getElementById('logoutBlock')
    const rangeDiv = document.getElementById('rangeDiv')
    const rightSettings = document.getElementById('rightSettings')
    if (authKey) {
        tgLogin.classList.add('hidden')
        logoutBlock.classList.remove('hidden')
        // rangeDiv.classList.remove('hidden')
        rightSettings.classList.remove('hidden')
    } else {
        tgLogin.classList.remove('hidden')
        logoutBlock.classList.add('hidden')
        // rangeDiv.classList.add('hidden')
        rightSettings.classList.add('hidden')
    }
}


async function getUsers(firstTime = false) {
    users.length = 0
    if (authKey) {
        const data = await getJSON('https://api.kupay.ru/system_api/hs/api/js_get_users?authKey=' + authKey)

        data.result.users.forEach((item) => {
            let option = new Option(item.name, item.id)
            usersElement.add(option)

            users.push({ id: item.id, name: item.name, rodPadezh: item.rodPadezh })

            if (item.thisUser) {
                usersElement.value = item.id
            }
        })

        if (data.result.users.length <= 1) {
            userSelectBlock.classList.add('hidden')
        } else {
            userSelectBlock.classList.remove('hidden')
        }
    }

    onUserChange()

    if (firstTime) {
        log({ eventName: 'pageOpen' })
    }
}

function animateArrows() {
    let updatedEdges = []

    const nodeCoordinates = network.getPositions()

    currentEdges.forEach(edge => {
        if (edge.arrows === '') {
            return
        } else if (edge.arrows === 'to' || edge.arrows === 'from') {
            if (edge.endPointOffset) {
                if (edge.endPointOffset[edge.arrows] <= 0) {

                    const node1Coordinates = nodeCoordinates[edge.to]
                    const node2Coordinates = nodeCoordinates[edge.from]

                    if (!node1Coordinates || !node2Coordinates) {
                        return
                    }
                    const node1 = currentNodes.get(edge.to)
                    const node2 = currentNodes.get(edge.from)
                    const realLength = (Math.sqrt((node1Coordinates.x - node2Coordinates.x) ** 2 + (node1Coordinates.y - node2Coordinates.y) ** 2)) - node2.size - node1.size - 70

                    edge.endPointOffset = { [edge.arrows]: realLength }
                    if (!realLength) {
                        return
                    }
                } else {
                    let newOffset = edge.endPointOffset[edge.arrows] - 3

                    if (!newOffset) {
                        newOffset = 0
                    }

                    edge.endPointOffset = { [edge.arrows]: newOffset }
                }
            } else {
                edge.endPointOffset = { [edge.arrows]: 0 }

            }
            updatedEdges.push(edge)
        }

        // edge.label = Math.round(realLength).toString() + " " + Math.round(edge.endPointOffset.to).toString()
    })

    currentEdges.update(updatedEdges)
}

function onUserChange() {

    states.ignoreDates = true
    states.forceReset = true
    dateRange.value = 0

    user.name = usersElement.options[usersElement.selectedIndex].text
    user.id = usersElement.value

    states.center = { x: 0, y: 0 }
    states.centerNodeId = 'center'
    settings.userDrawnId = fetchUserIdFromURL()

    settings.useNicknames = localStorage.getItem('useNicknames_' + settings.userDrawnId) === 'true';
    settings.focusMode = localStorage.getItem('focusMode_' + settings.userDrawnId) === 'true';

    const filterByTop = localStorage.getItem('filterByTop_' + settings.userDrawnId)
    settings.filterByTop = parseInt(filterByTop ?? 0)

    const usernameElement = document.getElementById('username')
    usernameElement.innerText = user.name

    updatePairs()
}



function fetchUserIdFromURL() {
    const path = window.location.pathname.replaceAll('/', '')
    if (path && path != 'graph.html') {
        return (path)
    } else if (user.id !== 'null') {
        return (user.id)
    } else {
        return ('1')
    }
}

async function updatePairs(event) {
    if (!authKey) {
        settings.useNicknames = true
    }

    statusElement.classList.remove('hidden')

    const data = await postJSON('getGraph', { addSecondAncestors: settings.addSecondAncestors, test: true, event, authKey, user_id: user.id, drawn_user_id: settings.userDrawnId })

    if (!('graph' in data.result)) {
        return
    }

    orderedResourses = []
    orderedBranches = []

    userNameLogo.innerText = data.result.drawnUser.rodPadezh
    settings.userDrawnName = data.result.drawnUser.name
    settings.userTG = data.result.drawnUser.TG

    if (data.result.drawnUser.id !== settings.userDrawnId) {
        settings.userDrawnId = data.result.drawnUser.id
    }

    if (user.id !== settings.userDrawnId) {
        history.replaceState({}, '', '/' + settings.userDrawnId);
    } else {
        history.replaceState({}, '', '/');
    }

    if (!authKey && settings.userDrawnId == '1') {
        history.replaceState({}, '', '/');
    }

    userNameLogo.style.fontSize = '2rem';
    fitText(userNameLogo)

    document.title = "Система. " + userNameLogo.innerText

    rawGraph = data.result.graph



    fillDateRangeArray()

    settings.userImage = rawGraph.centerUrl

    drawGraph(true)

}

function fillContractors() {

    let contragentsIds = []
    let contragents = []

    contrators.length = 0

    centerDeals.forEach(deal => {
        if (deal.employer && deal.employer.id !== settings.userDrawnId && !(contragentsIds.includes(deal.employer.id))) {
            contragentsIds.push(deal.employer.id)
            contragents.push(deal.employer)

        }
        if (deal.contractor && deal.contractor.id !== settings.userDrawnId && !(contragentsIds.includes(deal.contractor.id))) {
            contragentsIds.push(deal.contractor.id)
            contragents.push(deal.contractor)
        }
    })



    contragents.forEach(contragent => {
        let option_contractor = new Option(contragent.name, contragent.id)
        contrators.add(option_contractor)
    })
}

function fillDateRangeArray() {

    dateRangeValues = []

    rawGraph.centerDeals.forEach(deal => {

        if (deal.date) {
            let firstDay = new Date(deal.date.getFullYear(), deal.date.getMonth(), 1).getTime();
            if (!(dateRangeValues.includes(firstDay))) {
                dateRangeValues.push(firstDay)
            }
        }
    })

    dateRangeValues = dateRangeValues.map(a => new Date(a))

    dateRangeValues.sort((a, b) => {
        return (a - b)
    })

    dateRange.value = 0
    dateRange.max = dateRangeValues.length - 1
    onDateRangeInput(undefined, true)
}

async function drawGraph(stabilize = false, removeBoard = false, defaultDelay = 400) {

    console.log('drawGraph attempt')

    if (states.drawingNow) {
        setTimeout(drawGraph, 1000, stabilize, removeBoard)
        console.log('drawGraph aborted')
        return
    }

    states.forceReset = false

    edges.clear()
    nodes.clear()

    statusElement.classList.remove('hidden')

    const topDateRange = document.getElementById('topDateRange')

    if (states.playbackActive || !states.ignoreDates) {
        topDateRange.innerText = dateRangeValue
    } else {
        topDateRange.innerText = ''
    }

    graph = structuredClone(rawGraph)
    centerDeals = graph.centerDeals
    ancestory = graph.ancestory2
    thoughts = graph.thoughts
    // thoughts = filterThoughts()

    orderedBranches.forEach((x) => {
        x.isUsed = false
        x.resourses = []
    })

    totals.gave = 0
    totals.received = 0

    filterDealsByDate(centerDeals)

    if (settings.filterByTop) {
        filterTopDeals(settings.filterByTop)
    }

    // drawCenterTree()

    // drawExternalCloud()

    fillContractors()

    if (stabilize || removeBoard) {

        currentEdges.clear()

        if (states.centerNodeId != 'center') {
            currentNodes.remove(currentNodes.getIds({
                filter: (item) => {
                    return (item.id != states.centerNodeId)
                }
            }))
        } else {
            currentNodes.clear()
        }
    }

    // addUniverseDeals(pairs)

    // if (user.id === settings.userDrawnId) {
    //     addExternalDeals(pairs)
    // }

    drawTree(ancestory)

    // const centerTree = { deals: [], groups: [], dealsCount: 0 }
    // let last_resourse

    // center.deals.forEach(deal => {
    //     centerTree.dealsCount++
    //     if (!('parent' in deal)) {
    //         centerTree.deals.push(deal)
    //     } else if ('parent' in deal.parent) {
    //         const group = getGroup(centerTree.groups, {id: deal.parent.parent.id, name: deal.parent.parent.name})
    //         const subGroup = getGroup(group.groups, {id: deal.parent.id, name: deal.parent.name})
    //         subGroup.deals.push(deal)
    //     } else {
    //         const group = getGroup(centerTree.groups, {id: deal.parent.id, name: deal.parent.name})
    //         group.deals.push(deal)
    //     }
    // })



    // while (true) {
    //     let nextPair = getPairWithMostTransactions(pairs, 'ПараКонтрагентов', 'inner_res_')

    //     if (!nextPair) {
    //         contragents.forEach((agent) => {
    //             if (nodes.get('inner_res_' + agent.id) === null) {
    //                 addToCircle(agent, totals)
    //             }
    //         })
    //         break
    //     } else {
    //         addToCircle(nextPair.Resourse1, totals)
    //         addToCircle(nextPair.Resourse2, totals)

    //         last_resourse = nextPair.Resourse2
    //         let nextResourse

    //         while (true) {
    //             nextResourse = getResourseWithMostDeals(pairs, last_resourse, 'ПараКонтрагентов', 'inner_res_').resourse

    //             if (!nextResourse) {
    //                 break
    //             }

    //             addToCircle(nextResourse, totals)
    //             last_resourse = nextResourse
    //         }
    //     }
    // }

    // addContragentDeals(pairs)



    // if (stabilize) {
    //     network.moveTo({
    //         scale: 0.5, position: { x: 0, y: 0 }
    //     })
    // }


    if (stabilize) {
        network.setOptions({ physics: false })
    }

    await updateGraph(5000)

    states.drawingNow = false
    network.setOptions(options)

    if (stabilize) {
        // network.fit({ animation: true })
    }

    console.log('drawGraph done')

}

async function updateGraph(timeToFullRender = 5000) {

    console.log('slow update with timeToFullRender', timeToFullRender)

    if (states.drawingNow) {
        setTimeout(updateGraph, 200, timeToFullRender)
        console.log('updateGraph aborted')
        return
    }

    states.drawingNow = true

    statusElement.classList.remove('hidden')
    statusText.innerText = 'Обновление графа'

    let nodeToDel = []
    let nodeToAdd = []

    let edgeToDel = []
    let edgeToAdd = []

    let updatedNodeCnt = 0
    let nodesToUpdate = []

    currentNodes.forEach((currentNode) => {
        let newNode = nodes.get(currentNode.id)

        if (newNode && !_.isEqual(_.omit(currentNode, ['x', 'y', 'apex', 'angle']), _.omit(newNode, ['x', 'y', 'apex', 'angle']))) {
            delete newNode.x
            delete newNode.y
            // currentNodes.update(newNode)
            nodesToUpdate.push(newNode)
            updatedNodeCnt++
        } else if (!newNode) {
            nodeToDel.push(currentNode.id)
        }
    })

    currentNodes.update(nodesToUpdate)

    console.log('updated nodes:', updatedNodeCnt)

    nodes.forEach((newNode) => {
        let currentNode = currentNodes.get(newNode.id)

        if (!currentNode) {
            nodeToAdd.push(newNode)
        }
    })

    let updatedEdgeCnt = 0
    let edgesToUpdate = []

    currentEdges.forEach((currentEdge) => {
        let foundEdge = false

        edges.forEach((newEdge) => {
            if (
                newEdge.from == currentEdge.from &&
                newEdge.to == currentEdge.to &&
                newEdge.c_id == currentEdge.c_id) {

                if (!_.isEqual(_.omit(newEdge, ['id', 'endPointOffset']), _.omit(currentEdge, ['id', 'endPointOffset']))) {
                    // currentEdges.update({ ...newEdge, id: currentEdge.id })
                    updatedEdgeCnt++
                    edgesToUpdate.push({ ...newEdge, id: currentEdge.id })
                }

                foundEdge = true
                return
            }


        })

        if (!foundEdge) {
            edgeToDel.push(currentEdge.id)
        }
    })

    currentEdges.update(edgesToUpdate)
    console.log('updated edges:', updatedEdgeCnt)

    edges.forEach((newEdge) => {
        let foundEdge = false

        currentEdges.forEach((edge) => {
            if (
                newEdge.from == edge.from &&
                newEdge.to == edge.to &&
                newEdge.c_id == edge.c_id
            ) {
                foundEdge = true
                return
            }
        })

        if (!foundEdge) {
            edgeToAdd.push(newEdge)
        }
    })

    let delay = (timeToFullRender / (nodeToDel.length + nodeToAdd.length)) - 20
    delay = Math.max(0, delay)
    delay = Math.min(200, delay)
    const steps = Math.max(1, Math.round(delay / 40))

    if (timeToFullRender > 0 && delay == 0) {
        delay = 1
    }

    console.log('render starting, delay: ' + delay + ", steps: " + steps)

    for (const id of nodeToDel) {
        // console.log('deleting node')

        const node = currentNodes.get(id)
        const initLabel = node.label

        if (delay > 0 && steps > 0) {
            for (let i = 1; i <= steps; i++) {
                let remainingPart = (steps - i) / steps
                currentNodes.update({
                    id: id,
                    size: node.initialSize * remainingPart,
                    widthConstraint: node.initialWidthConstraint * remainingPart,
                    label: initLabel.slice(0, remainingPart * initLabel.length),
                })

                if (states.forceReset) {
                    states.drawingNow = false
                    states.forceReset = false
                    return
                }
                await timer(delay / steps)
            }
        }
        currentNodes.remove(id)
    }

    const nodeChildren = {}

    updateCenterGraphCoordinates(nodeToAdd)

    nodeToAdd.sort((a, b) => {
        return a.level - b.level
    }
    )

    for (const newNode of nodeToAdd) {

        if (['object', 'delegated'].includes(newNode.subType)) {
            // let parentNode2Id

            // if (newNode.parentResourseId.startsWith('outer_')) {
            //     parentNode2Id = newNode.parentResourseId.replace('outer_', 'inner_')
            // } else {
            //     parentNode2Id = states.centerNodeId
            // }

            // if (newNode.parentResourseId in nodeChildren) {
            //     nodeChildren[newNode.parentResourseId]++
            // } else {
            //     nodeChildren[newNode.parentResourseId] = 0
            // }

            // let angleCorrection = 0

            // if (nodeChildren[newNode.parentResourseId] % 2 == 0) {
            //     angleCorrection = nodeChildren[newNode.parentResourseId] * 2
            // } else {
            //     angleCorrection = (nodeChildren[newNode.parentResourseId] + 1) * -2
            // }


            // placeNodeBetweenOtherNodes(newNode, newNode.parentResourseId, parentNode2Id, angleCorrection)

        } else if (newNode.subType == 'thought') {

            placeNodeInlineToParent(newNode, newNode.parentNodeId, (newNode.thoughtCount) * 1.5, 0.5 * DISTANCE * newNode.stateCount)

        } else if (newNode.subType == 'objectBetweenCenterResourses') {

            placeNodeBetweenOtherNodes(newNode, newNode.parent1Id, newNode.parent2Id, 0)

        } else if (['addThought', 'addThoughtState', 'thoughtOutlet'].includes(newNode.subType)) {

            placeNodeInlineToParent(newNode, newNode.parentNodeId, 0, 100)

        }

        const initLabel = newNode.label

        // currentNodes.add(newNode)

        if (isNaN(newNode.x) || isNaN(newNode.y)) {
            console.log('No coordinates for node: ' + newNode.id)
        }

        if (delay > 0) {

            currentNodes.add({ ...newNode, size: 0, label: ' ', widthConstraint: 0 })

            for (let i = 1; i <= steps; i++) {
                let remainingPart = i / steps
                await timer(delay / steps)

                currentNodes.update({
                    id: newNode.id,
                    size: newNode.initialSize * remainingPart,
                    widthConstraint: newNode.initialWidthConstraint * remainingPart,
                    label: initLabel.slice(0, remainingPart * initLabel.length),
                })

                if (states.forceReset) {
                    states.drawingNow = false
                    states.forceReset = false
                    return
                }
            }
        } else {
            currentNodes.add(newNode)
        }

        var i = edgeToAdd.length
        while (i--) {
            const edge = edgeToAdd[i]
            const nodeTo = currentNodes.get(edge.to)
            const nodeFrom = currentNodes.get(edge.from)
            if (
                (edge.to === newNode.id && nodeFrom) || (nodeTo && edge.from === newNode.id)
            ) {
                if (checkEdgeOkForOuterNode(nodeTo, nodeFrom)) {
                    currentEdges.add(edge)
                }

                edgeToAdd.splice(i, 1)
            }
        }
    }

    for (const newEdge of edgeToAdd) {
        const nodeTo = currentNodes.get(newEdge.to)
        const nodeFrom = currentNodes.get(newEdge.from)
        if (checkEdgeOkForOuterNode(nodeTo, nodeFrom)) {
            currentEdges.add(newEdge)
        }
    }

    for (const id of edgeToDel) {
        currentEdges.remove(id)
    }

    states.drawingNow = false

    statusText.innerText = ''
    statusElement.classList.add('hidden')

    function updateCenterGraphCoordinates(nodeToAdd) {

        if (orderedBranches.length == 0) {
            return
        }
    
        const minAngle = 20
        const maxAngle = 340
    
        const currentPositions = network.getPositions()
    
        orderedBranches.forEach(branch => {
            const branchCoordinates = currentPositions['outer_' + branch.id]
            if (branchCoordinates) {
                branch.angle = getAngle(branchCoordinates.x, branchCoordinates.y, states.center).angle
            } else {
                branch.angle = undefined
            }
        })
    
        for (let arrayIndex = 0; arrayIndex < orderedBranches.length; arrayIndex++) {
    
            let closestCW
            let closestCCW
    
            let itemsCW = 0
            let itemsCCW = 0
    
            for (let index = arrayIndex + 1; index < orderedBranches.length; index++) {
                const branch = orderedBranches[index]
    
                if (branch.angle !== undefined) {
                    closestCW = branch.angle
                    break
                }
    
                itemsCW++
            }
    
            for (let index = arrayIndex - 1; index >= 0; index--) {
                const branch = orderedBranches[index]
    
                if (branch.angle !== undefined) {
                    closestCCW = branch.angle
                    break
                }
                itemsCCW++
            }
    
            closestCW = closestCW ?? maxAngle
            closestCCW = closestCCW ?? minAngle
    
            orderedBranches[arrayIndex].angle = closestCCW + (itemsCCW + 1) * ((closestCW - closestCCW) / (2 + itemsCW + itemsCCW))
        }
    
        let levelSiblings = []
    
        for (const newNode of nodeToAdd) {
            if ('branchId' in newNode) {
                const branchAngle = orderedBranches.find(branch => {
                    return branch.id == newNode.branchId
                }).angle
    
                let levelSibling = levelSiblings.find(item => {
                    return (item.branchId == newNode.branchId && item.level == newNode.level)
                })
    
                if (!levelSibling) {
                    levelSiblings.push({ branchId: newNode.branchId, level: newNode.level, count: 0 })
                    levelSibling = _.last(levelSiblings)
                } else {
                    levelSibling.count++
                }
    
                let angleCorrection = 0
    
                if (levelSibling.count % 2 == 0) {
                    angleCorrection = levelSibling.count * 2
                } else {
                    angleCorrection = (levelSibling.count + 1) * -2
                }
    
                const newCoordinates = getVectorCoordinates(branchAngle + angleCorrection, DISTANCE * newNode.level, states.center)
    
                newNode.x = newCoordinates.x
                newNode.y = newCoordinates.y
                newNode.angle = newCoordinates.angle
                newNode.apex = newCoordinates.apex
            }
            else if (newNode.subType == 'group') {
    
                const innerBranches = orderedBranches.filter(branch => {
                    return branch.parents.includes(newNode.groupId)
                })
    
                const branchAngles = innerBranches.map(a => a.angle)
                let maxAngle = Math.max(...branchAngles)
                let minAngle = Math.min(...branchAngles)
                const newAngle = minAngle + (maxAngle - minAngle) / 2
                const newCoordinates = getVectorCoordinates(newAngle, DISTANCE * newNode.level, states.center)
    
                newNode.x = newCoordinates.x
                newNode.y = newCoordinates.y
    
            }
        }
    }
    
}


function drawCenterTree() {

    // addOrderToCenterDeals()

    addCenterNodes()
    addFilterNodes()

    deleteSubGroupsWithOneDeal()
    sortCenterDeals()

    centerDeals.forEach(deal => {
        if ('deals' in deal) {
            addDelegatedDeals(deal)
        } else {
            addCenterDeal(deal)
        }
    })

    addRestThoughts()

    addDealsBetweenCenterResourses()

    const usedBranches = orderedBranches.filter((branch) => {
        return branch.isUsed
    })

    for (let i = 0; i < usedBranches.length; i++) {
        const outerNodeId = 'outer_' + usedBranches[i].id

        if (i == 0) {
            addEdge({ id1: 'inner_exit', id2: outerNodeId, physics: false, smooth: 'curvedCW', width: 10, roundness: 0.5, direction: 'to', label: "Артерия", fontSize: 30 })
        }

        if (i == usedBranches.length - 1) {
            addEdge({ id1: outerNodeId, id2: 'inner_exit', physics: false, smooth: 'curvedCW', width: 10, roundness: 0.5, direction: 'from', label: "Артерия", fontSize: 30 })
        }

        if (i < usedBranches.length - 1) {
            const nextOuterNodeId = 'outer_' + usedBranches[i + 1].id
            addEdge({ id1: outerNodeId, id2: nextOuterNodeId, physics: false, smooth: 'curvedCW', width: 5, roundness: 0.5, direction: i < usedBranches.length / 2 ? 'to' : 'from' })
        }
    }

    const totalsLabel =
        '<b>Обороты</b>\n\n' +
        'Получил ' +
        Math.round(totals.received).toString() +
        '$\n' +
        'Отдал ' +
        Math.round(totals.gave).toString() +
        '$'

    nodes.update({ id: 'inner_exit', label: totalsLabel })

    function addCenterNodes() {

        const centerLabel = '<b>' + settings.userDrawnName + '</b>'

        if (states.centerNodeId == 'center') {
            let centerNode = { id: states.centerNodeId, label: centerLabel, fixed: true }
            if (settings.userImage) {
                centerNode = { ...centerNode, level: -2, shape: 'circularImage', image: settings.userImage, imageSize: SIZES.NODE_IMAGE * 2, size: SIZES.NODE_BOX * 2, fontSize: 36 }
            }
            addNode(centerNode)
        } else {
            const newCenterNode = currentNodes.get(states.centerNodeId)
            const currentPosition = network.getPositions(states.centerNodeId)[states.centerNodeId]

            newCenterNode.x = currentPosition.x
            newCenterNode.y = currentPosition.y
            states.center.x = currentPosition.x
            states.center.y = currentPosition.y

            nodes.add(newCenterNode)
        }

        addNode({ id: 'triangle', shape: 'triangleDown', imageSize: 65, x: states.center.x, y: states.center.y - 400, fixed: true, level: -2, mass: 15 })
        addNode({ id: 'inner_exit', label: 'Обороты', shape: 'box', x: states.center.x, y: states.center.y - 498, fixed: true, subType: 'outer', angle: 0, level: -2, mass: 15 })

        if (settings.userTG) {
            addNode({ id: 'TG', shape: 'image', image: '/static/tg.png', imageSize: 40, x: states.center.x + 200, y: states.center.y, fixed: true, level: -2 })
            addEdge({ id1: 'TG', id2: states.centerNodeId, straight: true })
        }

        if (user.id === settings.userDrawnId) {
            addNode({
                id: 'new_deal',
                label: '+',
                shape: 'circle',
                color: 'rgb(250, 250, 214)',
                x: states.center.x + 150,
                y: states.center.y + 150,
                size: 40,
                fontSize: 24,
                fixed: true, level: -2
            })
            addEdge({ id1: states.centerNodeId, id2: 'new_deal', straight: true })
        }
        addEdge({ id1: states.centerNodeId, id2: 'triangle', label: "Артерия", straight: true, width: 20, length: 10, direction: 'to', fontSize: 30 })

    }


    function addFilterNodes() {

        const level = -2
        const centerCoordinates = { x: states.center.x, y: states.center.y - 498 }

        let node = { id: 'toggleAlias', label: "ПСЕВДОНИМЫ", coordinates: getVectorCoordinates(-25, DISTANCE, centerCoordinates) }
        addFilterNode(node, settings.useNicknames, 'inner_exit')

        node = { id: 'toggleFocus', label: "ФОКУС", coordinates: getVectorCoordinates(25, DISTANCE, centerCoordinates) }
        addFilterNode(node, settings.focusMode, 'inner_exit')

        const moneyNodeCoordinates = getVectorCoordinates(0, DISTANCE / 2, centerCoordinates)
        addNode({ id: 'money', label: '$$$', fixed: true, coordinates: moneyNodeCoordinates, level: -2, mass: 15 })
        addEdge({ id1: 'money', id2: 'inner_exit' })

        node = { id: 'topAll', label: "Все", coordinates: getVectorCoordinates(-12.5, DISTANCE, centerCoordinates) }
        addFilterNode(node, settings.filterByTop == 0, 'money')

        node = { id: 'top10', label: "Топ 10", coordinates: getVectorCoordinates(0, DISTANCE, centerCoordinates) }
        addFilterNode(node, settings.filterByTop == 10, 'money')

        node = { id: 'top30', label: "Топ 30", coordinates: getVectorCoordinates(12.5, DISTANCE, centerCoordinates) }
        addFilterNode(node, settings.filterByTop == 30, 'money')

        function addFilterNode(node, filterOn, parentNodeId) {
            node.size = filterOn ? SIZES.NODE_BOX * 1.4 : SIZES.NODE_BOX * 0.7
            node.fontSize = filterOn ? 24 : 14
            node.opacity = filterOn ? 1 : 0.4
            node.fixed = true
            node.level = level
            node.mass = 15
            addNode(node)
            addEdge({ id1: node.id, id2: parentNodeId })
        }
    }

    function addCenterDeal(deal) {

        if (deal.skip == true){
            return
        }
    
        let resourse
        let branchId = 'deal_' + deal.id


    
        let mostInnerNodeId = states.centerNodeId
        let level = 1
        let groups = []
    
        let hidden = false
    
        if ('parent' in deal && 'parent' in deal.parent) {
            groups.push(deal.parent.parent)
            hidden = hiddenGroups.includes(deal.parent.parent.id)
        }
    
        if ('parent' in deal && !hidden) {
            groups.push(deal.parent)
            hidden = hiddenGroups.includes(deal.parent.id)
        }
    
        groups.forEach(group => {
            let { id: newNodeId, isNew } = addGroupNode(group, mostInnerNodeId, { opacity: hidden ? 0.4 : 1, level, groupId: group.id, subType: 'group' })
            mostInnerNodeId = newNodeId
            level++
        })
    

        const userIsContractor = deal.contractor?.id === settings.userDrawnId
        const userIsEmployer = deal.employer.id === settings.userDrawnId
    
        if (userIsEmployer) {
            resourse = deal.contractor
        } else if (userIsContractor) {
            resourse = deal.employer
        }

        let profitDeals

        if (deal.object.type == 'Выгода') {
            profitDeals = centerDeals.reduce((res, subDeal) => {
                if ('deals' in subDeal) {
                    return res
                }
                
                const samePair = [subDeal.employer.id, subDeal.contractor?.id].includes(deal.employer.id) && [subDeal.employer.id, subDeal.contractor?.id].includes(deal.contractor.id) 
                const relevantDeal = subDeal.object.type == 'Выгода' && samePair
                if (relevantDeal) {
                    subDeal.skip = true
                    res.push(subDeal)
                } 
                return res
            }, [])

            branchId = 'profit_deals_' + resourse.id
        }
    
        let isAncestoral = false
    
        if (resourse && deal.object.type === 'Человек' && (userIsEmployer || userIsContractor)) {
            branchId = 'ancestoral_res_' + resourse.id
            isAncestoral = true
        }
    
        addToOrderedBranches(branchId, !hidden, groups.map(group => group.id))
    
        if (hidden) {
            return
        }
    
        let tempUseNicknames = settings.useNicknames

        if (resourse?.id === settings.partnerId) {
            settings.useNicknames = false
        }

        const edgeLabel = getEdgeLabels(profitDeals ? profitDeals : [deal])
        const paymentDashes = !!(edgeLabel.paymentState == 'incomplete' || edgeLabel.paymentState == 'notStarted')
        const executionDashes = !!(edgeLabel.executionState == 'incomplete' || edgeLabel.executionState == 'notStarted')
    
        if (userIsContractor) {
            addResourse(true, true)
            addObject()
    
            totals.received += edgeLabel.employerSum
            totals.gave += edgeLabel.contractorSum
        } else if (userIsEmployer) {
            addObject()
            addResourse(false, true)
    
            totals.gave += edgeLabel.employerSum
            totals.received += edgeLabel.contractorSum
        } else if (deal.object.id == settings.userDrawnId) {
            resourse = deal.contractor
            addResourse(false, false)
            resourse = deal.employer
            addResourse(true, false)
            resourse = undefined
        }
    
        addOuterNode()
    
        if (resourse) {
            addUserThoughts(resourse, deal.id, branchId, level)
        }
    
        settings.useNicknames = tempUseNicknames
    
        // if (user.id === settings.userDrawnId) {
        //     addUserThoughts(pair, outerNodeId)
        //     addPartnerThoughts(pair, innerNodeId)
        // }
    
        function addOuterNode() {
            const outerNodeId = 'outer_' + branchId
    
            const bigOuterNode = !!(deal.hasTension && (userIsEmployer || userIsContractor))
    
            const outerColor = bigOuterNode ? colors.mainRed : colors.mainGreen
            let label = bigOuterNode ? settings.userDrawnName + ' дает' : ''
            let size = bigOuterNode ? 100 : 1
    
            if (bigOuterNode && (userIsEmployer) && edgeLabel.employerSum > 200000) {
                size = 200
            }
    
            let shape = bigOuterNode ? 'circle' : 'dot'
    
            addNode({ id: outerNodeId, label, shape, color: outerColor, size, imageSize: 1, thoughtsExpanded: false, subType: 'outer', level, branchId })
    
            let dashes
            label = ''
            if (userIsEmployer || userIsContractor) {
                dashes = userIsContractor ? executionDashes : paymentDashes
                label = userIsContractor ? edgeLabel.contractorLabel : edgeLabel.employerLabel
            }
    
            addEdge({ id1: outerNodeId, id2: mostInnerNodeId, dashes, label, direction: 'to' })
    
        }
    
    
        function addObject() {
    
            if (!deal.hasObject) {
                return
            }
    
            const objectNodeId = 'object_deal_id_' + deal.id
            const image = getAliasPresentation(deal.object, 'image', settings.useNicknames)
            const label = '<b>' + getAliasPresentation(deal.object, 'name', settings.useNicknames) + '</b>'
    
            addNode({ id: objectNodeId, image, label, shape: image ? 'image' : 'box', size: 100, subType: 'object', level, branchId })
            level++
            addEdge({ id1: objectNodeId, id2: mostInnerNodeId, direction: 'to', label: deal.contractorGrateful ? '💚' : '' })
            mostInnerNodeId = objectNodeId
    
    
        }
    
        function addResourse(resourseIsEmployer, addThoughts) {
    
            if (!resourse) {
                return
            }
    
            const prefix = isAncestoral ? 'inner_res' : 'deal_' + deal.id + '_inner_res'
    
            let newNode = addResourseNode(resourse, prefix, false, { level, branchId })
            level++
    
            let dashes = resourseIsEmployer ? paymentDashes : executionDashes
            let label = resourseIsEmployer ? edgeLabel.employerLabel : edgeLabel.contractorLabel
    
            addEdge({ id1: mostInnerNodeId, id2: newNode.id, dashes, label, direction: 'from' })
            mostInnerNodeId = newNode.id
    
            if (addThoughts) {
                addPartnerThoughts(resourse, newNode.id, branchId, deal.id)
            }
    
        }
    
    }
    
    function addDelegatedDeals(delegated) {
    
        const resourseIds = delegated.deals.reduce((res, el) => {
            res.push(el.employer.id)
            res.push(el.contractor.id)
            return (res)
        }, [])
    
        if (delegated.deals.length < 2) {
            return
        }
    
        if (!(resourseIds.includes(settings.userDrawnId))) {
            return
        }
    
        let lastDeal
    
        delegated.deals.forEach(deal => {
            let nextDeal = delegated.deals.find(innerDeal => {
                return (innerDeal.employer.id === deal.contractor.id)
            })
    
            if (!nextDeal) {
                lastDeal = deal
            }
        })
    
        if (!lastDeal) {
            return
        }
    
        let branchId = 'delegated_' + delegated.object.id
    
        let mostInnerNodeId = states.centerNodeId
        let level = 1
        let groups = []
    
        let hidden = false
    
        if ('parent' in delegated && 'parent' in delegated.parent) {
            groups.push(delegated.parent.parent)
            hidden = hiddenGroups.includes(delegated.parent.parent.id)
        }
    
        if ('parent' in delegated && !hidden) {
            groups.push(delegated.parent)
            hidden = hiddenGroups.includes(delegated.parent.id)
        }
    
        groups.forEach(group => {
            let { id: newNodeId, isNew } = addGroupNode(group, mostInnerNodeId, { opacity: hidden ? 0.4 : 1, level, groupId: group.id, subType: 'group' })
            mostInnerNodeId = newNodeId
            level++
        })
    
        addToOrderedBranches(branchId, !hidden, groups.map(group => group.id))
    
        if (hidden) {
            return
        }
    
        let tempUseNicknames = settings.useNicknames
    
        if (resourseIds.includes(settings.partnerId)) {
            settings.useNicknames = false
        }
    
        let contractorId = settings.userDrawnId
    
        let deal
        let edgeLabel
        let paymentDashes
        let executionDashes
    
        let userIsEmployer = true
        let userIsContractor = false
    
        while (true) {
            deal = delegated.deals.find(deal => {
                return (deal.contractor.id === contractorId)
            })
    
            let addContractor = false
    
            if (!deal) {
                addObject(delegated.object)
                deal = lastDeal
    
                if (deal.contractor.id === settings.userDrawnId) {
                    break
                    userIsContractor = true
                    userIsEmployer = false
                }
    
                addContractor = true
            }
    
            edgeLabel = getEdgeLabels([deal])
            paymentDashes = !!(edgeLabel.paymentState == 'incomplete' || edgeLabel.paymentState == 'notStarted')
            executionDashes = !!(edgeLabel.executionState == 'incomplete' || edgeLabel.executionState == 'notStarted')
    
            if (addContractor) {
                addResourse(deal.contractor, false, true)
            }
    
            if (deal.employer.id === settings.userDrawnId) {
                break
            }
    
            addResourse(deal.employer, true, true)
            contractorId = deal.employer.id
        }
    
    
        addOuterNode()
    
        settings.useNicknames = tempUseNicknames
    
        function addOuterNode() {
            const outerNodeId = 'outer_' + branchId
    
            const bigOuterNode = !!(deal.hasTension && (userIsEmployer || userIsContractor))
    
            const outerColor = bigOuterNode ? colors.mainRed : colors.mainGreen
            let label = bigOuterNode ? settings.userDrawnName + ' дает' : ''
            let size = bigOuterNode ? 100 : 1
    
            if (bigOuterNode && (userIsEmployer) && edgeLabel.employerSum > 200000) {
                size = 200
            }
    
            let shape = bigOuterNode ? 'circle' : 'dot'
    
            addNode({ id: outerNodeId, label, shape, color: outerColor, size, imageSize: 1, thoughtsExpanded: false, subType: 'outer', level, branchId })
    
            let dashes
            label = ''
            if (true) {
                dashes = userIsContractor ? executionDashes : paymentDashes
                label = userIsContractor ? edgeLabel.contractorLabel : edgeLabel.employerLabel
            }
    
            addEdge({ id1: outerNodeId, id2: mostInnerNodeId, dashes, label, direction: 'to' })
    
        }
    
    
        function addObject(object) {
    
            const objectNodeId = 'object_id_' + object.id
            const image = getAliasPresentation(object, 'image', settings.useNicknames)
            const label = '<b>' + getAliasPresentation(object, 'name', settings.useNicknames) + '</b>'
    
            addNode({ id: objectNodeId, image, label, shape: image ? 'image' : 'box', size: 100, subType: 'object', level, branchId })
            level++
            addEdge({ id1: objectNodeId, id2: mostInnerNodeId, direction: 'to' })
            mostInnerNodeId = objectNodeId
    
    
        }
    
        function addResourse(resourse, resourseIsEmployer, addThoughts) {
    
            if (!resourse) {
                return
            }
    
            const prefix = 'deal_' + deal.id + '_inner_res_' + resourse.id
    
            let newNode = addResourseNode(resourse, prefix, false, { level, branchId })
            level++
    
            let dashes = resourseIsEmployer ? paymentDashes : executionDashes
            let label = resourseIsEmployer ? edgeLabel.employerLabel : edgeLabel.contractorLabel
    
            addEdge({ id1: mostInnerNodeId, id2: newNode.id, dashes, label, direction: 'from' })
            mostInnerNodeId = newNode.id
    
            if (addThoughts) {
                addPartnerThoughts(resourse, newNode.id, branchId, deal.id, true)
            }
    
        }
    
    }
    
}

function deleteSubGroupsWithOneDeal() {

    let subgroupDealCount = {}

    centerDeals.forEach(deal => {
        if (deal.parent?.parent) {
            if (deal.parent.id in subgroupDealCount) {
                subgroupDealCount[deal.parent.id]++
            } else {
                subgroupDealCount[deal.parent.id] = 1
            }
        }
    })

    centerDeals.forEach(deal => {
        if (deal.parent?.parent) {
            if (subgroupDealCount[deal.parent.id] == 1) {
                deal.parent = deal.parent.parent
                delete deal.parent.parent
            }
        }
    })



}

function addDealsBetweenCenterResourses() {

    let centerResourses = []

    let nodeList = nodes.get()
    orderedBranches.forEach(branch => {
        if (!branch.isUsed) {
            return
        }

        let resourses = nodeList.filter(node => {
            return (node.branchId === branch.id && node.resId)
        })

        branch.resourses = resourses.map(el => el.resId)

    })

    centerDeals.forEach(deal => {
        addToCenterResourses(deal.contractor)
        addToCenterResourses(deal.employer)

        if ('deals' in deal) {
            deal.deals.forEach(deal => {
                addToCenterResourses(deal.contractor)
                addToCenterResourses(deal.employer)
            })
        }
    })

    thoughts.forEach(thought => {
        const resourse = (thought.author.id == settings.userDrawnId) ? thought.partner : thought.author
        addToCenterResourses(resourse)
    })


    function addToCenterResourses(resourse) {
        if (!resourse || resourse.id === settings.userDrawnId) {
            return
        }
        let existingResourse = centerResourses.find(el => {
            return el.id === resourse.id
        })

        if (!existingResourse) {
            centerResourses.push({ id: resourse.id, contragents: [] })
        }
    }

    let repeatingPairs = []

    rawGraph.externalDeals.forEach(deal => {
        const existingContractor = centerResourses.find(resourse => {
            return resourse.id === deal.contractor?.id
        })
        const existingEmployer = centerResourses.find(resourse => {
            return resourse.id === deal.employer.id
        })

        if (!existingEmployer || !existingContractor) {
            return
        }

        const bestPair = findBestBranches(deal.employer, deal.contractor)

        if (!bestPair.branch1) {
            return
        }

        const employerNode = nodeList.find(node => {
            return (node.branchId === orderedBranches[bestPair.branch1].id && node.resId === deal.employer.id)
        })

        const contractorNode = nodeList.find(node => {
            return (node.branchId === orderedBranches[bestPair.branch2].id && node.resId === deal.contractor.id)
        })

        if (!employerNode || !contractorNode) {
            return
        }

        deal.drawnInCenter = true

        let pair = repeatingPairs.find(el => {
            return (el.employerId == deal.employer.id && el.contractorId == deal.contractor.id)
        })

        let cnt

        if (pair) {
            pair.cnt++
            cnt = pair.cnt
        } else {
            repeatingPairs.push({ employerId: deal.employer.id, contractorId: deal.contractor.id, cnt: 1 })
            cnt = 1
        }

        const edgeLabel = getEdgeLabels([deal])
        addEdge({ id1: employerNode.id, id2: contractorNode.id, label: edgeLabel.employerLabel, direction: 'to', c_id: cnt })

        let mostInnerNodeId = employerNode.id

        if (deal.hasObject) {
            const objectNodeId = 'object_deal_id_' + deal.id
            const image = getAliasPresentation(deal.object, 'image', settings.useNicknames)
            const label = '<b>' + getAliasPresentation(deal.object, 'name', settings.useNicknames) + '</b>'

            addNode({ id: objectNodeId, image, label, shape: image ? 'image' : 'box', size: 100, parent1Id: employerNode.id, parent2Id: contractorNode.id, subType: 'objectBetweenCenterResourses', level: Math.max(employerNode.level, contractorNode.level) })
            addEdge({ id1: objectNodeId, id2: employerNode.id, direction: 'to', label: deal.contractorGrateful ? '💚' : '' })
            mostInnerNodeId = objectNodeId
        }

        addEdge({ id1: contractorNode.id, id2: mostInnerNodeId, direction: 'to', label: edgeLabel.contractorLabel })

    }
    )

    function findBestBranches(resourse1, resourse2) {

        let bestPair = { branch1: undefined, branch2: undefined }
        let lastSeenIndexes = { resourse1: undefined, resourse2: undefined }

        orderedBranches.forEach((branch, ind) => {
            if (branch.resourses.includes(resourse1.id)) {
                lastSeenIndexes.resourse1 = ind
            }

            if (branch.resourses.includes(resourse2.id)) {
                lastSeenIndexes.resourse2 = ind
            }

            if (lastSeenIndexes.resourse1 !== undefined && lastSeenIndexes.resourse2 !== undefined && lastSeenIndexes.resourse2 !== lastSeenIndexes.resourse1) {
                const distance = Math.abs(lastSeenIndexes.resourse1 - lastSeenIndexes.resourse2)
                if (bestPair.branch1 === undefined || distance < Math.abs(bestPair.branch1 - bestPair.branch2)) {
                    bestPair.branch1 = lastSeenIndexes.resourse1
                    bestPair.branch2 = lastSeenIndexes.resourse2
                }
            }
        })

        return bestPair

    }

}

function addOrderToCenterDeals() {
    let centerResourses = []

    centerDeals.forEach(deal => {
        addToCenterResourses(deal.contractor)
        addToCenterResourses(deal.employer)

        if ('deals' in deal) {
            deal.deals.forEach(deal => {
                addToCenterResourses(deal.contractor)
                addToCenterResourses(deal.employer)
            })
        }
    })

    thoughts.forEach(thought => {
        const resourse = (thought.author.id = settings.userDrawnId) ? thought.partner : thought.author
        addToCenterResourses(resourse)
    })


    function addToCenterResourses(resourse) {
        if (!resourse || resourse.id === settings.userDrawnId) {
            return
        }
        let existingResourse = centerResourses.find(el => {
            return el.id === resourse.id
        })

        if (!existingResourse) {
            centerResourses.push({ id: resourse.id, contragents: [] })
        }
    }

    rawGraph.externalDeals.forEach(deal => {
        let existingContractor = centerResourses.find(el => {
            return el.id === deal.contractor?.id
        })
        let existingEmployer = centerResourses.find(el => {
            return el.id === deal.employer.id
        })

        if (!existingEmployer || !existingContractor) {
            return
        }

        function addToContragents(resourseObject, contragent) {
            let existingContragent = resourseObject.contragents.find(el => {
                return el.id === contragent.id
            })

            if (existingContragent) {
                existingContragent.cnt++
            } else {
                resourseObject.contragents.push({ id: contragent.id, cnt: 1 })
            }
        }

        addToContragents(existingEmployer, deal.contractor)
        addToContragents(existingContractor, deal.employer)

    })

    let groupedDeals = centerDeals.reduce((res, deal) => {
        let existingEl = res.find(el => {
            return el.id === deal.parent?.id
        })

        if (!existingEl) {
            res.push({ id: deal.parent?.id, deals: [deal] })
        } else {
            existingEl.deals.push(deal)
        }
        return res
    }, [])

    // groupedDeals.forEach(group => {


    // })
}

function sortCenterDeals() {
    centerDeals.sort((d2, d1) => {

        let order = [[], []];

        [d2, d1].forEach((el, ind) => {

            order[ind].push(el.parent?.parent?.order ?? Infinity)
            order[ind].push(parseInt(el.parent?.parent?.id) || Infinity)
            order[ind].push(el.parent?.order ?? Infinity)
            order[ind].push(parseInt(el.parent?.id) || Infinity)

            if (el.parent && !el.parent.parent) {
                order[ind][0] = order[ind][2]
                order[ind][1] = order[ind][3]
                order[ind][3] = Infinity
                order[ind][4] = Infinity
            }

            order[ind].push(el.date)
            order[ind].push(parseInt(el.id))

        })

        for (let index = 0; index < 6; index++) {
            if (order[0][index] !== order[1][index]) {
                return (order[0][index] - order[1][index])
            }

        }

    })
}


function addGroupNode(group, mostInnerNodeId, { ...additionalParams } = {}) {

    const label = group.name
    const nodeId = "group_" + group.id
    let newNode

    if (group.image) {
        newNode = addNode({ id: nodeId, shape: 'image', label, image: group.image, fontSize: 24, imageSize: SIZES.NODE_IMAGE, ...additionalParams, })
    } else {
        newNode = addNode({ id: nodeId, label, shape: 'box', ...additionalParams, })
    }

    if (newNode.isNew) {
        let groupDeals = centerDeals.reduce((res, el) => {
            if ((el.parent?.id == group.id || el.parent?.parent?.id == group.id) && !el.deals) {
                res.push(el)
            }

            if ('deals' in el) {
                let delegated = el.deals.find(deal => {
                    return (deal.contractor.id == settings.userDrawnId || deal.employer.id == settings.userDrawnId)
                })
                res.push(delegated)
            }

            return res
        }, [])

        const edgeLabel = getEdgeLabels(groupDeals, settings.userDrawnId)

        addEdge({ id1: newNode.id, id2: mostInnerNodeId, label: edgeLabel.contractorLabel, direction: 'to' })
    }

    return newNode

}


function filterDealsByDate(deals) {

    if (!states.ignoreDates || settings.focusMode) {

        deals = deals.filter((deal) => {
            const dealRange = getDealDateRange(deal)

            if ('deals' in deal) {
                return (deal.date < dealRange.end && deal.date > dealRange.start)
            }

            for (const stage of deal.stages) {
                const dateStartOk =
                    (stage.date && stage.date > dealRange.start) ||
                    (stage.planDate && stage.planDate > dealRange.start) ||
                    deal.date > dealRange.start
                const dateEndOk =
                    (stage.date && stage.date < dealRange.end) ||
                    (stage.planDate && stage.planDate < dealRange.end) ||
                    deal.date < dealRange.end

                if (dateEndOk && dateStartOk) {
                    return true
                }
            }
            return false
        })



    }
}

function filterTopDeals(top) {
    let topDeals = []

    centerDeals.forEach(deal => {
        topDeals.push({ id: deal.id, sum: deal.sum })
    })

    topDeals.sort((a, b) => {
        if (a.sum > b.sum) {
            return -1
        } else {
            return 1
        }
    })

    topDeals = topDeals.slice(0, top);

    centerDeals = centerDeals.filter((deal) => {
        return topDeals.find(subDeal => subDeal.id == deal.id)
    })
}

function onLogoClick() {

    history.replaceState({}, '', '/');
    states.center = { x: 0, y: 0 }
    states.centerNodeId = 'center'

    settings.userDrawnId = fetchUserIdFromURL()

    states.ignoreDates = true
    states.forceReset = true
    dateRange.value = 0

    updatePairs('logoClick')

}

function onUseNicknameToggle() {

    settings.useNicknames = !settings.useNicknames
    if (!settings.useNicknames) {
        settings.partnerId = ''
    }
    localStorage.setItem('useNicknames_' + settings.userDrawnId, settings.useNicknames);

    log({ eventName: 'useNicknamesToggle', parameter: { type: 'bool', value: settings.useNicknames } })

    drawGraph()
}

function onLogout() {

    log({ eventName: 'logout' })

    states.forceReset = true

    eraseCookie('authKey')
    authKey = null
    setLoginVisibility()
    resetDropDown()

    userSelectBlock.classList.add('hidden')
    statusText.innerText = ''
    statusElement.classList.add('hidden')
    edges.clear()
    nodes.clear()

    updateGraph(0)

    pairs = []
    raw_pairs = []
    dateRange.value = 0
    dateRangeValues = []
    dateRangeValue = ''
    for (let member in user) {
        delete user[member]
    }
    onUserChange()


}

function createNewDeal(params) {
    let contractorId = contrators.value
    console.log(contractorId)

    getJSON('https://api.kupay.ru/system_api/hs/api/js_create_deal?authKey=' + authKey + '&user_id=' + user.id + '&contractor_id=' + contractorId).then((data) => {
        updatePairs()
    })
    const newDealModal = document.getElementById('newDealModal')
    newDealModal.close()
}

function onResetRange() {

    if (states.playbackActive) {
        onStartRange()
    }

    if (this.id == 'resetRange') {
        log({ eventName: 'reset', parameter: { type: 'text', value: 'Клип по кнопке СТОП' } })
    } else if (this.id == 'userNameLogo') {
        log({ eventName: 'reset', parameter: { type: 'text', value: 'Клип по Юзернейму' } })
    }

    states.ignoreDates = true
    states.forceReset = true
    dateRange.value = 0

    drawGraph(true)
}

function onStartRange() {

    if (states.playbackActive) {
        startButton.innerHTML = '&#9658;'
        states.playbackActive = false
        dateRange.disabled = false
        log({ eventName: 'pauseLife' })
        return
    }

    log({ eventName: 'startLife' })

    startButton.innerHTML = '&#9616;&#9616;'
    states.playbackActive = true
    dateRange.disabled = true

    if (dateRange.value == dateRange.max) {
        dateRange.value = 0
    }

    advanceDate()
}

async function advanceDate() {
    if (dateRange.value == dateRange.max) {
        startButton.innerHTML = '&#9658;'
        states.playbackActive = false
        dateRange.disabled = false
        return
    }

    if (!states.playbackActive || states.forceReset) {
        return
    }

    if (states.drawingNow) {
        setTimeout(advanceDate, 1000)
    } else {
        await timer(1500)
        if (!states.playbackActive) {
            return
        }
        if (!states.ignoreDates) {
            dateRange.value = Number(dateRange.value) + 1
        }
        onDateRangeInput()
        setTimeout(advanceDate, 1000)
    }
}

function onManualDateRangeInput() {
    onDateRangeInput()
    log({ eventName: "dateChange", parameter: { type: 'date', value: settings.date } })
}

function onDateRangeInput(params, skipDrawing) {
    console.log('onDateRangeInput')

    if (dateRangeValues.length == 0) {
        return
    }

    settings.date = dateRangeValues[dateRange.value]
    const month = settings.date.toLocaleString('ru-RU', { month: 'long' })
    const year = settings.date.getFullYear()
    dateRangeValue = month + ' ' + year.toString()
    dateRangeValue = dateRangeValue[0].toUpperCase() + dateRangeValue.slice(1);

    if (skipDrawing) {
        return
    }

    let removeBoard = false

    if (states.ignoreDates) {
        states.forceReset = true
        removeBoard = true
    }

    states.ignoreDates = false

    console.log('starting drawing from onDateInput')

    clearTimeout(rangeTimer)
    rangeTimer = setTimeout(drawGraph, 1000, false, removeBoard)
}

function onFocusToggle() {

    states.forceReset = true

    settings.focusMode = !settings.focusMode

    log({ eventName: 'focusToggle', parameter: { type: 'bool', value: settings.focusMode } })
    localStorage.setItem('focusMode_' + settings.userDrawnId, settings.focusMode);

    dateRange.disabled = settings.focusMode
    startButton.disabled = settings.focusMode
    resetButton.disabled = settings.focusMode

    console.log('starting drawing from onFocusToggle')

    clearTimeout(rangeTimer)
    rangeTimer = setTimeout(drawGraph, 1000, false, false, 80)
}

function addContragentDeals(pairs) {
    pairs.forEach((pair) => {
        if (pair.PairType === 'ПараКонтрагентов') {
            pair.Deals.forEach((deal) => {
                const edgeLabel = getEdgeLabels([deal])
                const dealNodeId = 'res_' + pair.Resourse1.id + '_' + pair.Resourse2.id + 'deal_id' + deal.id
                const innerRes1Id = 'inner_res_' + pair.Resourse1.id
                const innerRes2Id = 'inner_res_' + pair.Resourse2.id

                const objectDescription = getAliasPresentation(deal.object, 'name', settings.useNicknames)
                const objectImage = getAliasPresentation(deal.object, 'image', settings.useNicknames)

                if (objectImage) {
                    addNode({ id: dealNodeId, label: objectDescription, shape: 'circularImage', image: objectImage, imageSize: 70, subType: 'contragentDeal', parent1Id: innerRes1Id, parent2Id: innerRes2Id, })
                } else {
                    addNode({ id: dealNodeId, label: objectDescription, shape: 'box', color: colors.mainBlue, subType: 'contragentDeal', parent1Id: innerRes1Id, parent2Id: innerRes2Id, })
                }

                addEdge({ id1: dealNodeId, id2: innerRes1Id, label: deal.contractorGrateful ? '💚' : '', direction: 'to' })
                addEdge({ id1: innerRes2Id, id2: dealNodeId, direction: 'to' })
                addEdge({ id1: innerRes1Id, id2: innerRes2Id, label: edgeLabel.gaveLabel, direction: 'to' })
            })
        }
    })
}

function drawExternalCloud() {

    const externalDeals = rawGraph.externalDeals

    if (!externalDeals) {
        return
    }

    const centerCoordinates = { x: 3000, y: 0 }
    let last_resourse

    let allResourses = new Set()

    let pairs = []

    externalDeals.forEach(deal => {

        if ('drawnInCenter' in deal || !deal.contractor) {
            return
        }

        const resourse1 = deal.contractor.id < deal.employer.id ? deal.contractor : deal.employer
        const resourse2 = deal.contractor.id < deal.employer.id ? deal.employer : deal.contractor

        let existingPair = pairs.find(pair => {
            return pair.resourse1.id == resourse1.id && pair.resourse2.id == resourse2.id
        })

        if (!existingPair) {
            existingPair = { resourse1, resourse2, deals: [], isDrawn: false }
            pairs.push(existingPair)
        }

        existingPair.deals.push(deal)

        allResourses.add(deal.contractor.id)
        allResourses.add(deal.employer.id)

    })


    const angleDelta = 360 / allResourses.size

    let resourseCount = 0

    while (true) {
        const nextPair = getPairWithMostTransactions(pairs)

        if (!nextPair) {
            pairs.forEach((pair) => {
                if (pair.isDrawn) {
                    return
                }

                addPair(pair)
            })
            break
        } else {

            addPair(nextPair)

            last_resourse = nextPair.resourse2

            while (true) {
                const nextEntity = getResourseWithMostDeals(pairs, last_resourse)

                if (!nextEntity.pair) {
                    break
                }

                addPair(nextEntity.pair)
                last_resourse = nextEntity.resourse
            }
        }
    }

    function addPair(pair) {
        let prevUseNicknames = settings.useNicknames
        if ([pair.resourse1.id, pair.resourse2.id].includes(settings.partnerId)) {
            settings.useNicknames = false
        }
        addToExternalCloud(pair.resourse1)
        addToExternalCloud(pair.resourse2)
        addPairDeals(pair)
        settings.useNicknames = prevUseNicknames
    }

    function addPairDeals(pair) {
        pair.isDrawn = true
        const node1 = nodes.get('ext_res_' + pair.resourse1.id)
        const node2 = nodes.get('ext_res_' + pair.resourse2.id)
        const x = (node2.x + node1.x) / 2
        const y = (node2.y + node1.y) / 2

        const edgeLabel = getEdgeLabels(pair.deals)

        const pairDealsId = 'res_' + pair.resourse2.id + '_' + pair.resourse1.id

        addNode({ id: pairDealsId, label: edgeLabel.description, color: 'rgb(240, 240, 240)', shape: 'box', x, y })
        addEdge({ id1: pairDealsId, id2: node1.id, label: '', direction: 'to' })
        addEdge({ id1: pairDealsId, id2: node2.id, label: '', direction: 'to' })
    }

    function addToExternalCloud(resourse) {

        const node = nodes.get('ext_res_' + resourse.id)

        if (node) {
            return
        }

        let angle = angleDelta * resourseCount
        const color = getColorByType(resourse.type)
        const label = getAliasPresentation(resourse, 'name', settings.useNicknames)

        const coordinates = getVectorCoordinates(angle, DISTANCE, states.center)
        coordinates.x += centerCoordinates.x
        coordinates.y += centerCoordinates.y

        addNode({ id: 'ext_res_' + resourse.id, label, color: color, shape: 'circle', coordinates })

        resourseCount++
    }


}

function getColorByType(type) {
    let color = 'rgb(173,216,230)'
    if (type === 'Бизнес') {
        color = colors.mainYellow
    } else if (type === 'Товар') {
        color = 'rgb(200,230,160)'
    }
    return color
}

export function addNode({ id, image = undefined, label = '', shape = 'circle', color = colors.mainGreen, imageSize = 25, x = 0, y = 0, size = SIZES.NODE_BOX, fontSize = 14, physics = true, ...additionalParams } = test) {

    image ??= undefined

    if (additionalParams.resId === settings.partnerId) {
        fontSize *= 2
        imageSize *= 2
        size *= 2
    }

    if ('coordinates' in additionalParams) {
        x = additionalParams.coordinates.x
        y = additionalParams.coordinates.y
    }

    if (!('level' in additionalParams)) {
        additionalParams.level = 100
    }

    const font = { multi: true, size: fontSize }
    const newNode = { id: id, image: image, label: label, font: font, x, y, shape: shape, borderWidth: 2, size: imageSize, initialSize: imageSize, color: color, widthConstraint: size, initialWidthConstraint: size, initialFontSize: fontSize, physics: physics, ...additionalParams, }

    let result = { id }
    if (nodes.get(id)) {
        delete newNode.x
        delete newNode.y
        delete newNode.minAngle
        delete newNode.maxAngle
        nodes.update(newNode)
        result.isNew = false
    } else {
        nodes.add(newNode)
        result.isNew = true
    }

    return result

}

export function addEdge({ dashes = false, id1, id2, label = '', smooth = undefined, roundness = 0, physics = true, direction = '', length = undefined, c_id = 1, fontSize = 14, ...additionalParams }) {
    const font = { align: 'middle', multi: true, size: fontSize }
    const id = id1 + '_' + id2 + "_" + c_id.toString()
    if (smooth) {
        edges.update({ id, from: id1, dashes, font, to: id2, label, arrows: direction, physics, smooth: { type: smooth, roundness: roundness }, c_id, ...additionalParams, })
    } else {
        length = length ?? Math.max(250, 80 + label.length * 10)
        edges.update({ id, from: id1, dashes, font, to: id2, label, arrows: direction, physics, length, c_id, ...additionalParams })
    }
}

function getEdgeLabels(deals, resourseId) {

    if (!resourseId) {
        resourseId = deals[0].employer.id
    }

    let employerSum = 0
    let contractorSum = 0

    let description = ''
    let dealTransfer

    let directDeals = 0

    let employerHearts = 0
    let contractorHearts = 0

    const currencies = {}

    deals.forEach((deal) => {

        directDeals += 1

        description += getAliasPresentation(deal, 'description', settings.useNicknames)

        dealTransfer = getDealTransfer(deal)

        employerSum += (deal.employer.id == resourseId ? dealTransfer.employerSum : dealTransfer.contractorSum)
        contractorSum += (deal.employer.id !== resourseId ? dealTransfer.employerSum : dealTransfer.contractorSum)

        employerHearts += (deal.employer.id == resourseId ? dealTransfer.employerHearts : dealTransfer.contractorHearts)
        contractorHearts += (deal.employer.id !== resourseId ? dealTransfer.employerHearts : dealTransfer.contractorHearts)

        if (!(deal.currency.id in currencies)) {
            currencies[deal.currency.id] = { symbol: deal.currency.symbol, contractor: 0, employer: 0 }
        }

        currencies[deal.currency.id].employer += (deal.employer.id == resourseId ? dealTransfer.employerSumCurrency : dealTransfer.contractorSumCurrency)
        currencies[deal.currency.id].contractor += (deal.employer.id !== resourseId ? dealTransfer.employerSumCurrency : dealTransfer.contractorSumCurrency)


    })

    let contractorLabel = ''

    if (contractorHearts) {
        contractorLabel = '💚'.repeat(contractorHearts) + ' '
    }

    let employerLabel = ''

    if (employerHearts) {
        employerLabel = '💚'.repeat(employerHearts) + ' '
    }

    for (let [id, currency] of Object.entries(currencies)) {
        if (currency.contractor > 0) {
            contractorLabel += currency.contractor.toString() + currency.symbol + ", "
        }
        if (currency.employer > 0) {
            employerLabel += currency.employer.toString() + currency.symbol + ", "
        }
    }

    if (employerLabel.endsWith(', ')) {
        employerLabel = employerLabel.slice(0, -2)
    }


    if (contractorLabel.endsWith(', ')) {
        contractorLabel = contractorLabel.slice(0, -2)
    }

    let paymentState
    let executionState

    if (directDeals > 1) {
        paymentState = 'multiple'
        executionState = 'multiple'
    } else if (directDeals == 1) {
        if (dealTransfer.paymentPercent == 100) {
            paymentState = 'complete'
        } else if (dealTransfer.paymentPercent > 0) {
            paymentState = 'incomplete'
            employerLabel += ' (' + dealTransfer.paymentPercent + '%)'
        } else {
            paymentState = 'notStarted'
            if (dealTransfer.earliestPaymentDate)
                employerLabel = 'План - ' + dealTransfer.earliestPaymentDate.toLocaleString()
            else {
                employerLabel = 'План не задан'
            }
        }
        if (dealTransfer.executionPercent == 100) {
            executionState = 'complete'
        } else if (dealTransfer.executionPercent > 0) {
            executionState = 'incomplete'
            contractorLabel += ' (' + dealTransfer.executionPercent + '%)'
        } else {
            executionState = 'notStarted'
            if (dealTransfer.earliestExecutionDate)
                contractorLabel =
                    'План - ' + dealTransfer.earliestExecutionDate.toLocaleString()
            else {
                contractorLabel = 'План не задан'
            }
        }
    }

    return { executionState, paymentState, description, employerLabel, contractorLabel, employerSum, contractorSum }

    function getDealTransfer(deal) {
        let executionPercent = 0
        let paymentPercent = 0

        let earliestPaymentDate
        let earliestExecutionDate

        const SumWithProfit = deal.sum + deal.profitSum
        const CurrencySumWithProfit = deal.currency.value + deal.currency.profit

        deal.stages.forEach((stage) => {
            if (!states.ignoreDates || settings.focusMode) {

                const dealRange = getDealDateRange(deal)

                if (stage.date && stage.date < dealRange.start && stage.planDate && stage.planDate < dealRange.start
                ) {
                    return
                }

                if (stage.date && stage.date > dealRange.end && stage.planDate && stage.planDate > dealRange.end
                ) {
                    return
                }
            }

            if (stage.stage === 'Оплата') {
                paymentPercent += stage.percent
                if (!earliestPaymentDate || earliestPaymentDate < new Date(stage.planDate)) {
                    earliestPaymentDate = new Date(stage.planDate)
                }
            } else if (stage.stage === 'Исполнение') {
                executionPercent += stage.percent
                if (!earliestExecutionDate || earliestExecutionDate < new Date(stage.planDate)) {
                    earliestExecutionDate = new Date(stage.planDate)
                }
            }
        })

        let employerSum = deal.sum * (paymentPercent / 100)
        let employerSumCurrency = deal.currency.value * (paymentPercent / 100)
        let contractorSum = 0
        let contractorSumCurrency = 0
        let employerHearts = 0
        let contractorHearts = 0

        if (deal.employerGrateful) {
            employerHearts++
        }
        if (deal.contractorGrateful && !deal.hasObject) {
            contractorHearts++
        }

        if (deal.Type === 'Инвестиционная') {
            contractorSum = SumWithProfit * (executionPercent / 100)
            contractorSumCurrency = CurrencySumWithProfit * (executionPercent / 100)
        }

        return { employerHearts, contractorHearts, employerSum, employerSumCurrency, contractorSum, contractorSumCurrency, paymentPercent, executionPercent, earliestPaymentDate, earliestExecutionDate }
    }


}


function getPairWithMostTransactions(pairs) {
    let topPair
    let maxDeals = 0

    pairs.forEach((pair) => {
        if (!pair.isDrawn && pair.deals.length > maxDeals) {
            topPair = pair
        }
    })

    return topPair
}


function checkEdgeOkForOuterNode(nodeTo, nodeFrom) {

    if (!nodeTo || !nodeFrom) {
        return false
    }

    if (nodeTo.subType === 'outer' && nodeFrom.subType === 'outer') {
        let toAngle = nodeTo.angle
        let fromAngle = nodeFrom.angle
        if (toAngle == undefined && fromAngle == undefined) {
            return true
        }
        toAngle = toAngle < fromAngle ? 360 + toAngle : toAngle

        if (toAngle - fromAngle > 100) {
            return false
        }

    }

    return true
}

function placeNodeInlineToParent(newNode, parentNodeId, angleCorrection, distance) {

    const parrentNode = network.getPositions(parentNodeId)[parentNodeId]
    const parrentNodeVector = getAngle(parrentNode.x, parrentNode.y, states.center)
    const newCoordinates = getVectorCoordinates(parrentNodeVector.angle + angleCorrection, parrentNodeVector.distance + distance, states.center)
    newNode.x = newCoordinates.x
    newNode.y = newCoordinates.y
}

function placeNodeBetweenOtherNodes(newNode, node1, node2, angleCorrection) {

    const parrentNode1coordinates = network.getPositions(node1)[node1]
    const parrentNode2coordinates = network.getPositions(node2)[node2]

    const vectorBetweenParents = getAngle(parrentNode2coordinates.x, parrentNode2coordinates.y, parrentNode1coordinates)

    // const angle = (parrentNodeVector1.angle + parrentNodeVector2.angle) / 2
    // const distance = 

    const newCoordinates = getVectorCoordinates(vectorBetweenParents.angle + angleCorrection, vectorBetweenParents.distance / 2, parrentNode1coordinates)
    newNode.x = newCoordinates.x
    newNode.y = newCoordinates.y
}

function getResourceCoordinates(nodeId, prefix) {

    const currentPositions = network.getPositions()

    const arrayIndex = orderedResourses.findIndex((x) => {
        return x.id === nodeId.replace(prefix, '')
    })

    let closestCW
    let closestCCW

    let itemsCW = 0
    let itemsCCW = 0

    for (let index = arrayIndex + 1; index < orderedResourses.length; index++) {
        const resId = prefix + orderedResourses[index].id

        if (resId in currentPositions && resId != states.centerNodeId) {
            closestCW = getAngle(
                currentPositions[resId].x,
                currentPositions[resId].y, states.center
            ).angle
            break
        }

        if (orderedResourses[index].isUsed || true) {
            itemsCW += 1
        }
    }

    for (let index = arrayIndex - 1; index >= 0; index--) {
        const resId = prefix + orderedResourses[index].id

        if (resId in currentPositions && resId != states.centerNodeId) {
            closestCCW = getAngle(
                currentPositions[resId].x,
                currentPositions[resId].y, states.center
            ).angle
            break
        }
        if (orderedResourses[index].isUsed || true) {
            itemsCCW += 1
        }
    }

    closestCW = closestCW ?? 330
    closestCCW = closestCCW ?? 30

    let distanceMultiplier = 1
    let innerDistanceMultiplier = 0

    const node = nodes.get(nodeId)
    if ('delegated' in node) {
        distanceMultiplier += node.delegated
    }

    if (prefix == 'outer_') {
        const innerNode = nodes.get(nodeId.replace(prefix, 'inner_'))
        innerDistanceMultiplier += 1
        if ('delegated' in innerNode) {
            innerDistanceMultiplier += innerNode.delegated
        }
    }

    distanceMultiplier += innerDistanceMultiplier

    const totalDistance = DISTANCE * distanceMultiplier

    const angle =
        closestCCW +
        (itemsCCW + 1) * ((closestCW - closestCCW) / (2 + itemsCW + itemsCCW))
    const newCoordinates = getVectorCoordinates(angle, totalDistance, states.center)
    const apex = innerDistanceMultiplier + (distanceMultiplier - innerDistanceMultiplier) / 2

    return { ...newCoordinates, angle, apex, totalDistance }
}

export function addToOrderedBranches(id, isUsed, parents = [], resourses = []) {
    const obj = orderedBranches.find((item) => {
        return item.id === id
    })

    if (obj) {
        obj.isUsed = isUsed
        obj.parents = parents
        obj.resourses = resourses
    } else {
        orderedBranches.push({ id, isUsed, parents, angle: undefined, resourses })
    }
}

function findPairByResourseId(resourseId) {
    const pair = pairs.find((pair) => {
        return (
            ((pair.Resourse1.id === settings.userDrawnId &&
                pair.Resourse2.id === resourseId) ||
                (pair.Resourse2.id === settings.userDrawnId &&
                    pair.Resourse1.id === resourseId)) &&
            !pair.IsUni
        )
    })

    return pair
}


export function addResourseNode(resourse, prefix, ignoreNicknames, { ...additionalParams } = {}) {

    let tempUseNicknames = settings.useNicknames

    if (ignoreNicknames) {
        settings.useNicknames = false
    }

    const resourseName = getAliasPresentation(resourse, 'name', settings.useNicknames)
    const image = getAliasPresentation(resourse, 'image', settings.useNicknames)
    const label = '<b>' + resourseName + '</b>'

    settings.useNicknames = tempUseNicknames

    let size = SIZES.NODE_BOX
    let imageSize = SIZES.NODE_IMAGE

    if (image) {
        return addNode({ id: prefix + resourse.id, label: label, shape: 'circularImage', image: image, imageSize, resId: resourse.id, ...additionalParams, })
    } else {
        return addNode({ id: prefix + resourse.id, label: label, shape: 'box', size, resId: resourse.id, ...additionalParams, })
    }


}

function getResourseWithMostDeals(pairs, resourse) {
    let maxDeals = 0
    let topResourse
    let topPair

    pairs.forEach((pair) => {
        if (pair.isDrawn) {
            return
        }

        if (![pair.resourse1.id, pair.resourse2.id].includes(resourse.id)) {
            return
        }

        if (pair.deals.length > maxDeals) {
            topResourse = pair.resourse1.id === resourse.id ? pair.resourse2 : pair.resourse1
            topPair = pair
        }
    })

    return { resourse: topResourse, pair: topPair }
}

function onSelectNode(params) {

    params.nodes.forEach((nodeId) => {
        if (!nodeCanChangeSize(nodeId)) {
            return
        }

        const node = currentNodes.get(nodeId)
        currentNodes.update({ id: nodeId, widthConstraint: node.initialWidthConstraint * 2, size: node.initialSize * 2, font: { multi: true, size: node.initialFontSize * 2 } })
    })

}

function deselectNode(params) {
    params.previousSelection.nodes.forEach((nodeObj) => {
        const node = currentNodes.get(nodeObj.id)
        if (!nodeCanChangeSize(nodeObj.id)) {
            return
        }
        if (node) {
            currentNodes.update({ id: nodeObj.id, widthConstraint: node.initialWidthConstraint, size: node.initialSize, font: { multi: true, size: node.initialFontSize } })
        }
    })
}

function nodeCanChangeSize(nodeId) {
    if (['toggleFocus', 'toggleAlias', 'top30', 'top10', 'topAll'].includes(nodeId)) {
        return false
    }

    return true

}

function getDealDateRange(deal) {
    let monthsDelta = 1

    if (deal.sum > 1000000) {
        monthsDelta = 600
    } else if (deal.sum > 100000) {
        monthsDelta = 12
    } else if (deal.sum > 10000) {
        monthsDelta = 3
    }

    let start
    let end

    if (settings.focusMode) {
        start = new Date(new Date().setMonth(new Date().getMonth() - 1))
        end = new Date()
    } else {
        start = new Date(
            new Date(settings.date).setMonth(settings.date.getMonth() - monthsDelta)
        )
        end = new Date(
            new Date(settings.date).setMonth(settings.date.getMonth() + monthsDelta)
        )
    }

    return { start, end }
}


function preNetworkOnClick(params) {
    const t0 = new Date();
    if (t0 - doubleClickTime > doubleClickthreshold) {
        setTimeout(function () {
            if (t0 - doubleClickTime > doubleClickthreshold) {
                networkOnClick(params);
            }
        }, doubleClickthreshold);
    }
}

function networkOnClick(params) {

    console.log('network click')

    if (states.drawingNow) {
        return
    }

    if (!params.nodes.length && !params.edges.length) {
        return
    }

    let nodeId = network.getNodeAt(params.pointer.DOM)
    let edgeId = network.getEdgeAt(params.pointer.DOM)

    if (nodeId) {
        handleNodeClick(nodeId, params.pointer.canvas.x, params.pointer.canvas.y)
    } else if (edgeId) {
        handleEdgeClick(edgeId)
    }
}

function handleEdgeClick(edgeId) {
    const edge = currentEdges.get(edgeId)
    let badPair = false

    let edgeIds = []

    edges.forEach((oldEdge) => {
        if (oldEdge.from == edge.from && oldEdge.to == edge.to) {
            edgeIds.push(oldEdge.id)
        }
    })

    if (edge.to === states.centerNodeId && edge.from.startsWith('inner_res_')) {
        const resId = edge.from.replace('inner_res_', '')

        const pair = pairs.find((pair) => {
            return (
                ((pair.Resourse1.id === settings.userDrawnId &&
                    pair.Resourse2.id === resId) ||
                    (pair.Resourse2.id === settings.userDrawnId &&
                        pair.Resourse1.id === resId)) &&
                !pair.IsUni
            )
        })

        if (!pair || pair.Deals.length == 0) {
            badPair = true
            return
        }

        let cnt = 0

        pair.Deals.forEach((deal) => {
            cnt += 1
            let edgeLabel = getEdgeLabels([deal])
            let executionDashes = false

            if (
                edgeLabel.executionState == 'incomplete' ||
                edgeLabel.executionState == 'notStarted'
            ) {
                executionDashes = true
            }

            if (edgeLabel.directConnectionToCenter) {
                addEdge({
                    id1: 'inner_res_' + resId,
                    dashes: executionDashes,
                    id2: states.centerNodeId,
                    length: edge.length,
                    label: edgeLabel.receivedLabel,
                    direction: 'to',
                    c_id: cnt,
                })
            }
        })
    } else if (
        edge.to.startsWith('inner_res_') &&
        edge.from.startsWith('outer_res_')
    ) {
        const resId = edge.to.replace('inner_res_', '')

        const pair = pairs.find((pair) => {
            return (
                ((pair.Resourse1.id === settings.userDrawnId &&
                    pair.Resourse2.id === resId) ||
                    (pair.Resourse2.id === settings.userDrawnId &&
                        pair.Resourse1.id === resId)) &&
                !pair.IsUni
            )
        })

        if (!pair || pair.Deals.length == 0) {
            badPair = true
            return
        }

        let cnt = 0

        pair.Deals.forEach((deal) => {
            cnt += 1
            let edgeLabel = getEdgeLabels([deal])
            let paymentDashes = false
            if (
                edgeLabel.paymentState == 'incomplete' ||
                edgeLabel.paymentState == 'notStarted'
            ) {
                paymentDashes = true
            }

            if (edgeLabel.directConnectionToInner) {
                addEdge({
                    id1: 'outer_res_' + resId,
                    dashes: paymentDashes,
                    id2: 'inner_res_' + resId,
                    length: edge.length,
                    label: edgeLabel.gaveLabel,
                    direction: 'to',
                    c_id: cnt,
                })
            }
        })
    } else {


        return
    }

    if (badPair) {
        return
    }

    edgeIds.forEach((id) => {
        edges.remove(id)
    })

    updateGraph()
}

function onfilterTopToggle(top) {

    if (settings.filterByTop !== top) {
        settings.filterByTop = top
        localStorage.setItem('filterByTop_' + settings.userDrawnId, settings.filterByTop);
        drawGraph()
    }

}

function handleNodeClick(nodeId, clickX, clickY) {
    // const clickedNode = currentNodes.get(nodeId)

    if (nodeId === 'toggleFocus') {
        onFocusToggle()
    } else if (nodeId === 'toggleAlias') {
        onUseNicknameToggle()
    } else if (nodeId === 'top30') {
        onfilterTopToggle(30)
    }
    else if (nodeId === 'top10') {
        onfilterTopToggle(10)
    } else if (nodeId === 'topAll') {
        onfilterTopToggle(0)
    } else if (nodeId === 'addSecondAncestors') {
        onaddSecondAncestorsToggle()
    }

    function onaddSecondAncestorsToggle() {
        settings.addSecondAncestors = !settings.addSecondAncestors
        updatePairs()
    }


    // if (currentNodes.get('deals_' + clickedNode.id)) {
    //     return
    // }

    // if (clickedNode.id.startsWith('inner_res_')) {
    //     const resId = nodeId.replace('inner_res_', '')

    //     const pair = pairs.find((pair) => {
    //         return (
    //             pair.PairType === 'ПользовательКонтрагент' &&
    //             (pair.Resourse1.id === resId || pair.Resourse2.id === resId)
    //         )
    //     })

    //     const edgeLabel = getEdgeLabels(pair.Deals, settings.userDrawnId)

    //     addNode({
    //         id: 'deals_' + clickedNode.id,
    //         x: clickX,
    //         y: clickY + 100,
    //         label: edgeLabel.description,
    //         shape: 'box',
    //     })
    //     addEdge({
    //         id1: 'deals_' + clickedNode.id,
    //         id2: clickedNode.id,
    //         length: 75,
    //     })
    //     updateGraph()
    // }
}

let doubleClickTime = 0;
const doubleClickthreshold = 400;

function networkOnDoubleClick(params) {
    console.log('networkOnDoubleClick')
    doubleClickTime = new Date()

    let nodeId = this.getNodeAt(params.pointer.DOM)

    if (!nodeId) {
        return
    }

    if (states.drawingNow) {
        return
    }

    const clickedNode = nodes.get(nodeId)

    if (clickedNode.resId && !clickedNode.id.startsWith('outer_')) {
        if (!authKey) {
            return
        }

        if (settings.useNicknames) {
            onResourseClick(clickedNode)
            return
        }

        settings.userDrawnId = clickedNode.resId

        currentNodes.update({ id: nodeId, resId: undefined, size: clickedNode.initialSize * 2, initialSize: clickedNode.initialSize * 2, fixed: true, widthConstraint: clickedNode.initialWidthConstraint * 2, initialWidthConstraint: clickedNode.initialWidthConstraint * 2, initialFontSize: 36, font: { multi: true, size: 36 } })

        states.centerNodeId = nodeId

        states.ignoreDates = true
        states.forceReset = true
        dateRange.value = 0

        updatePairs('drawnUserChange')


    } else if (nodeId == 'TG') {
        window.open('https://t.me/' + settings.userTG, '_blank').focus();
    } else if (clickedNode.subType = 'group') {
        onGroupClick(clickedNode)
    }
    else if (clickedNode.id === 'new_deal') {
        const newDealModal = document.getElementById('newDealModal')
        newDealModal.showModal()
    } else if (nodeId.startsWith('outer_res_')) {

        clickedNode.thoughtsExpanded = true
        const resId = nodeId.replace('outer_res_', '')
        const pair = findPairByResourseId(resId)
        addUserThoughts(pair, nodeId)
        updateGraph()

    } else if (nodeId.startsWith('addThought')) {
        const thoughtModal = document.getElementById('thoughtModal')
        thoughtModal.dataset.id = clickedNode.thoughtId
        thoughtModal.dataset.branchId = clickedNode.branchId
        thoughtModal.dataset.partnerId = clickedNode.partnerId
        const nameElement = document.getElementById('thoughtDescription')

        if (clickedNode.thoughtName) {
            nameElement.value = clickedNode.thoughtName
        } else {
            nameElement.value = ''
        }

        if (clickedNode.lastThoughtType === 'bad') {
            document.getElementById('badThought').checked = true
        } else {
            document.getElementById('goodThought').checked = true
        }

        thoughtModal.showModal()
    }
}

function onResourseClick(node) {

    if (!settings.useNicknames || settings.userDrawnId !== user.id) {
        return
    }

    if (node.resId == settings.partnerId) {
        settings.partnerId = ''
    } else {
        settings.partnerId = node.resId
    }

    drawGraph()
}

function onGroupClick(node) {

    const index = hiddenGroups.indexOf(node.groupId);

    if (index > -1) {
        hiddenGroups.splice(index, 1)
    } else {
        hiddenGroups.push(node.groupId)
    }

    drawGraph()
}


async function onUpdateThought(e) {

    const thoughtModal = document.getElementById('thoughtModal')
    const thoughtNameElement = document.getElementById('thoughtDescription')
    const newThoughtName = thoughtNameElement.value
    if (!newThoughtName) {
        thoughtNameElement.classList.remove('noBorder')
        thoughtNameElement.classList.add('redBorder')
        return
    }

    updateThoughtButton.disabled = true

    const selectedState = document.querySelector('input[name="thoughtState"]:checked').value;
    const selectedType = document.querySelector('input[name="thoughtGoodBad"]:checked').value;

    // console.log(thoughtState, thoughtType)

    const branchId = thoughtModal.dataset.branchId
    const partnerId = thoughtModal.dataset.partnerId
    // const pair = findPairByResourseId(resId)

    if (thoughtModal.dataset.id != 'undefined') {

        const currentThought = rawGraph.thoughts.find((thought) => {
            return (thought.id === thoughtModal.dataset.id)
        })

        currentThought.description = newThoughtName
        const state = { type: selectedType, state: selectedState, date: new Date() }
        currentThought.states.push(state)

        postJSON('newState', { authKey, state, Thought: { id: thoughtModal.dataset.id, name: newThoughtName } })

    } else {

        let newThought = {
            id: crypto.randomUUID(), description: newThoughtName, states: [],
            author: { id: user.id }, partner: { id: partnerId }
        }

        let state = { type: selectedType, state: 'Пришла', date: new Date() }
        newThought.states.push(state)
        if (selectedState != 'Пришла') {
            let now = new Date();
            now.setSeconds(now.getSeconds() + 1);
            state = { type: selectedType, state: selectedState, date: now }
            newThought.states.push(state)
        }


        rawGraph.thoughts.push(newThought)

        statusElement.classList.remove('hidden')
        const data = await postJSON('newThought', { authKey, state, userId: user.id, partnerId, Thought: { name: newThoughtName } })
        newThought.id = data.result.thoughtId

    }

    thoughtModal.close()

    updateThoughtButton.disabled = false

    addUserThoughts({ id: partnerId }, undefined, branchId)
    updateGraph()

}

async function onTelegramAuth(user) {
    const response = await postJSON('getAuthCredentials', { user: user })

    if (!('key' in response.result)) {
        console.log('auth failed')
    }

    authKey = response.result.key

    createCookie('authKey', authKey, 1000)

    setLoginVisibility()
    getUsers(false)
}

window.onTelegramAuth = onTelegramAuth


