/**
 * DSL Parser for bitrealm
 * Parses the custom domain-specific language according to the EBNF grammar:
 * 
 * script := { event_block } ;
 * event_block := 'on' event_name '{' { statement } '}' ;
 * statement := assignment | if_stmt | give | warp | emit | wait | script_block ;
 */
export class DSLParser {
  constructor() {
    this.position = 0
    this.tokens = []
    this.current = null
  }

  parse(source) {
    this.tokens = this.tokenize(source)
    this.position = 0
    this.current = this.tokens[0]
    
    return this.parseScript()
  }

  tokenize(source) {
    const tokens = []
    let i = 0
    
    while (i < source.length) {
      const char = source[i]
      
      // Skip whitespace
      if (/\s/.test(char)) {
        i++
        continue
      }
      
      // Skip comments
      if (char === '/' && source[i + 1] === '/') {
        while (i < source.length && source[i] !== '\n') {
          i++
        }
        continue
      }
      
      // Block comments
      if (char === '/' && source[i + 1] === '*') {
        i += 2
        while (i < source.length - 1) {
          if (source[i] === '*' && source[i + 1] === '/') {
            i += 2
            break
          }
          i++
        }
        continue
      }
      
      // String literals
      if (char === '"' || char === "'") {
        const quote = char
        let value = ''
        i++
        
        while (i < source.length && source[i] !== quote) {
          if (source[i] === '\\') {
            i++
            if (i < source.length) {
              switch (source[i]) {
                case 'n': value += '\n'; break
                case 't': value += '\t'; break
                case 'r': value += '\r'; break
                case '\\': value += '\\'; break
                case '"': value += '"'; break
                case "'": value += "'"; break
                default: value += source[i]; break
              }
            }
          } else {
            value += source[i]
          }
          i++
        }
        
        tokens.push({ type: 'STRING', value })
        i++
        continue
      }
      
      // Numbers
      if (/\d/.test(char)) {
        let value = ''
        while (i < source.length && /[\d.]/.test(source[i])) {
          value += source[i]
          i++
        }
        tokens.push({ type: 'NUMBER', value: parseFloat(value) })
        continue
      }
      
      // Identifiers and keywords
      if (/[a-zA-Z_$]/.test(char)) {
        let value = ''
        while (i < source.length && /[a-zA-Z0-9_$]/.test(source[i])) {
          value += source[i]
          i++
        }
        
        // Check for keywords
        const keywords = [
          'on', 'if', 'else', 'give', 'warp', 'emit', 'wait', 'script',
          'player', 'npc', 'item', 'true', 'false'
        ]
        
        if (keywords.includes(value)) {
          tokens.push({ type: value.toUpperCase(), value })
        } else {
          tokens.push({ type: 'IDENTIFIER', value })
        }
        continue
      }
      
      // Operators and punctuation
      switch (char) {
        case '{': tokens.push({ type: 'LBRACE', value: char }); break
        case '}': tokens.push({ type: 'RBRACE', value: char }); break
        case '(': tokens.push({ type: 'LPAREN', value: char }); break
        case ')': tokens.push({ type: 'RPAREN', value: char }); break
        case ';': tokens.push({ type: 'SEMICOLON', value: char }); break
        case ',': tokens.push({ type: 'COMMA', value: char }); break
        case '=':
          if (source[i + 1] === '=') {
            tokens.push({ type: 'EQ', value: '==' })
            i++
          } else {
            tokens.push({ type: 'ASSIGN', value: char })
          }
          break
        case '!':
          if (source[i + 1] === '=') {
            tokens.push({ type: 'NEQ', value: '!=' })
            i++
          } else {
            tokens.push({ type: 'NOT', value: char })
          }
          break
        case '<':
          if (source[i + 1] === '=') {
            tokens.push({ type: 'LTE', value: '<=' })
            i++
          } else {
            tokens.push({ type: 'LT', value: char })
          }
          break
        case '>':
          if (source[i + 1] === '=') {
            tokens.push({ type: 'GTE', value: '>=' })
            i++
          } else {
            tokens.push({ type: 'GT', value: char })
          }
          break
        case '+': tokens.push({ type: 'PLUS', value: char }); break
        case '-': tokens.push({ type: 'MINUS', value: char }); break
        case '*': tokens.push({ type: 'MULTIPLY', value: char }); break
        case '/': tokens.push({ type: 'DIVIDE', value: char }); break
        case '.': tokens.push({ type: 'DOT', value: char }); break
        default:
          throw new Error(`Unexpected character: ${char} at position ${i}`)
      }
      
      i++
    }
    
    tokens.push({ type: 'EOF', value: null })
    return tokens
  }

  advance() {
    this.position++
    if (this.position < this.tokens.length) {
      this.current = this.tokens[this.position]
    }
    return this.current
  }

  expect(tokenType) {
    if (this.current.type !== tokenType) {
      throw new Error(`Expected ${tokenType}, got ${this.current.type}`)
    }
    const token = this.current
    this.advance()
    return token
  }

  parseScript() {
    const events = []
    
    while (this.current.type !== 'EOF') {
      if (this.current.type === 'ON') {
        events.push(this.parseEventBlock())
      } else {
        throw new Error(`Unexpected token: ${this.current.type}`)
      }
    }
    
    return { events }
  }

  parseEventBlock() {
    this.expect('ON')
    const eventName = this.expect('IDENTIFIER').value
    this.expect('LBRACE')
    
    const statements = []
    while (this.current.type !== 'RBRACE') {
      statements.push(this.parseStatement())
    }
    
    this.expect('RBRACE')
    
    return {
      event: eventName,
      statements
    }
  }

  parseStatement() {
    switch (this.current.type) {
      case 'IDENTIFIER':
        return this.parseAssignment()
      case 'IF':
        return this.parseIfStatement()
      case 'GIVE':
        return this.parseGiveStatement()
      case 'WARP':
        return this.parseWarpStatement()
      case 'EMIT':
        return this.parseEmitStatement()
      case 'WAIT':
        return this.parseWaitStatement()
      case 'SCRIPT':
        return this.parseScriptBlock()
      default:
        throw new Error(`Unexpected statement: ${this.current.type}`)
    }
  }

  parseAssignment() {
    const variable = this.expect('IDENTIFIER').value
    this.expect('ASSIGN')
    const value = this.parseExpression()
    this.expect('SEMICOLON')
    
    return {
      type: 'assignment',
      variable,
      value
    }
  }

  parseIfStatement() {
    this.expect('IF')
    this.expect('LPAREN')
    const condition = this.parseCondition()
    this.expect('RPAREN')
    this.expect('LBRACE')
    
    const thenStatements = []
    while (this.current.type !== 'RBRACE') {
      thenStatements.push(this.parseStatement())
    }
    this.expect('RBRACE')
    
    let elseStatements = null
    if (this.current.type === 'ELSE') {
      this.advance()
      this.expect('LBRACE')
      elseStatements = []
      while (this.current.type !== 'RBRACE') {
        elseStatements.push(this.parseStatement())
      }
      this.expect('RBRACE')
    }
    
    return {
      type: 'if',
      condition,
      thenStatements,
      elseStatements
    }
  }

  parseGiveStatement() {
    this.expect('GIVE')
    const player = this.parsePlayerRef()
    const item = this.parseExpression()
    const quantity = this.parseExpression()
    this.expect('SEMICOLON')
    
    return {
      type: 'give',
      player,
      item,
      quantity
    }
  }

  parseWarpStatement() {
    this.expect('WARP')
    const player = this.parsePlayerRef()
    const mapId = this.parseExpression()
    const x = this.parseExpression()
    const y = this.parseExpression()
    this.expect('SEMICOLON')
    
    return {
      type: 'warp',
      player,
      mapId,
      x,
      y
    }
  }

  parseEmitStatement() {
    this.expect('EMIT')
    const channel = this.parseExpression()
    this.expect('COMMA')
    const message = this.parseExpression()
    this.expect('SEMICOLON')
    
    return {
      type: 'emit',
      channel,
      message
    }
  }

  parseWaitStatement() {
    this.expect('WAIT')
    const duration = this.parseExpression()
    this.expect('SEMICOLON')
    
    return {
      type: 'wait',
      duration
    }
  }

  parseScriptBlock() {
    this.expect('SCRIPT')
    this.expect('LBRACE')
    
    // Collect everything until the closing brace as JavaScript code
    let code = ''
    let braceCount = 1
    
    while (braceCount > 0 && this.current.type !== 'EOF') {
      if (this.current.type === 'LBRACE') {
        braceCount++
      } else if (this.current.type === 'RBRACE') {
        braceCount--
      }
      
      if (braceCount > 0) {
        if (this.current.type === 'STRING') {
          code += `"${this.current.value}"`
        } else if (this.current.type === 'NUMBER') {
          code += this.current.value
        } else {
          code += this.current.value
        }
        code += ' '
      }
      
      this.advance()
    }
    
    return {
      type: 'script',
      code: code.trim()
    }
  }

  parseCondition() {
    const left = this.parseExpression()
    const operator = this.parseOperator()
    const right = this.parseExpression()
    
    return {
      left,
      operator,
      right
    }
  }

  parseOperator() {
    const operators = ['EQ', 'NEQ', 'LT', 'GT', 'LTE', 'GTE']
    if (operators.includes(this.current.type)) {
      const op = this.current.value
      this.advance()
      return op
    }
    throw new Error(`Expected operator, got ${this.current.type}`)
  }

  parseExpression() {
    // Simple expression parsing - can be extended for complex expressions
    if (this.current.type === 'STRING') {
      const value = this.current.value
      this.advance()
      return value
    }
    
    if (this.current.type === 'NUMBER') {
      const value = this.current.value
      this.advance()
      return value
    }
    
    if (this.current.type === 'IDENTIFIER') {
      let value = this.current.value
      this.advance()
      
      // Handle property access (e.g., player.level)
      while (this.current.type === 'DOT') {
        this.advance()
        value += '.' + this.expect('IDENTIFIER').value
      }
      
      return value
    }
    
    if (this.current.type === 'TRUE') {
      this.advance()
      return true
    }
    
    if (this.current.type === 'FALSE') {
      this.advance()
      return false
    }
    
    throw new Error(`Unexpected expression: ${this.current.type}`)
  }

  parsePlayerRef() {
    if (this.current.type === 'PLAYER') {
      this.advance()
      return 'player'
    }
    
    if (this.current.type === 'IDENTIFIER') {
      const ref = this.current.value
      this.advance()
      return ref
    }
    
    throw new Error(`Expected player reference, got ${this.current.type}`)
  }
}