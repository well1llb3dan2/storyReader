# Gemini 3.1 Flash Text to speech

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /api/v1/jobs/createTask:
    post:
      summary: Gemini 3.1 Flash Text to speech
      deprecated: false
      description: >-
        Content generation using elevenlabs/audio-isolation


        ## Query Task Status


        After submitting a task, use the unified query endpoint to check
        progress and retrieve results:


        <Card title="Get Task Details" icon="lucide-search"
        href="/market/common/get-task-detail">
          Learn how to query task status and retrieve generation results
        </Card>


        ::: tip[]

        For production use, we recommend using the `callBackUrl` parameter to
        receive automatic notifications when generation completes, rather than
        polling the status endpoint.

        :::


        ## Related Resources


        <CardGroup cols={3}>
          <Card title="Market Overview" icon="lucide-store" href="/market/quickstart">
            Explore all available models
          </Card>
          <Card title="File Upload API" icon="lucide-cog" href="/file-upload-api/quickstart">
            Learn how to upload and manage files
          </Card>
          <Card title="Common API" icon="lucide-webhook" href="/common-api/get-account-credits">
            Check credits and account usage
          </Card>
        </CardGroup>
      operationId: gemini-3-1-flash-tts
      tags:
        - docs/en/Market/Music Models/Gemini
      parameters: []
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                model:
                  type: string
                  description: Model to be used
                  enum:
                    - google/gemini-3-1-flash-tts
                  default: google/gemini-3-1-flash-tts
                  x-apidog-enum:
                    - value: google/gemini-3-1-flash-tts
                      name: ''
                      description: ''
                callBackUrl:
                  type: string
                  description: Callback URL for the result
                input:
                  type: object
                  description: Input parameters for the generation task
                  properties:
                    temperature:
                      type: number
                      minimum: 0
                      maximum: 2
                      default: 1
                      description: Sampling temperature, e.g., 1
                    scene:
                      type: string
                      default: ''
                      description: >-
                        Scene description, e.g., "A quiet, warm room with a
                        fireplace crackling softly."
                    sample_context:
                      type: string
                      default: ''
                      description: >-
                        Sample context/overall tone, e.g., "Audiobook style
                        narration. Tone is gentle and inviting."
                    speakers:
                      type: array
                      description: List of speaker configurations
                      items:
                        type: object
                        properties:
                          speaker_id:
                            type: string
                            description: >-
                              Speaker identifier, e.g., "Speaker 1" or "Speaker
                              2";Must be 「Speaker N」format
                          voice_name:
                            type: string
                            description: Voice name, e.g., "Zephyr", "Fenrir", "Puck"
                            enum:
                              - Achernar
                              - Achird
                              - Algenib
                              - Algieba
                              - Alnilam
                              - Aoede
                              - Autonoe
                              - Callirrhoe
                              - Charon
                              - Despina
                              - Enceladus
                              - Erinome
                              - Fenrir
                              - Gacrux
                              - Iapetus
                              - Kore
                              - Laomedeia
                              - Leda
                              - Orus
                              - Puck
                              - Pulcherrima
                              - Rasalgethi
                              - Sadachbia
                              - Sadaltager
                              - Schedar
                              - Sulafat
                              - Umbriel
                              - Vindemiatrix
                              - Zephyr
                              - Zubenelgenubi
                            x-apidog-enum:
                              - value: Achernar
                                name: ''
                                description: ''
                              - value: Achird
                                name: ''
                                description: ''
                              - value: Algenib
                                name: ''
                                description: ''
                              - value: Algieba
                                name: ''
                                description: ''
                              - value: Alnilam
                                name: ''
                                description: ''
                              - value: Aoede
                                name: ''
                                description: ''
                              - value: Autonoe
                                name: ''
                                description: ''
                              - value: Callirrhoe
                                name: ''
                                description: ''
                              - value: Charon
                                name: ''
                                description: ''
                              - value: Despina
                                name: ''
                                description: ''
                              - value: Enceladus
                                name: ''
                                description: ''
                              - value: Erinome
                                name: ''
                                description: ''
                              - value: Fenrir
                                name: ''
                                description: ''
                              - value: Gacrux
                                name: ''
                                description: ''
                              - value: Iapetus
                                name: ''
                                description: ''
                              - value: Kore
                                name: ''
                                description: ''
                              - value: Laomedeia
                                name: ''
                                description: ''
                              - value: Leda
                                name: ''
                                description: ''
                              - value: Orus
                                name: ''
                                description: ''
                              - value: Puck
                                name: ''
                                description: ''
                              - value: Pulcherrima
                                name: ''
                                description: ''
                              - value: Rasalgethi
                                name: ''
                                description: ''
                              - value: Sadachbia
                                name: ''
                                description: ''
                              - value: Sadaltager
                                name: ''
                                description: ''
                              - value: Schedar
                                name: ''
                                description: ''
                              - value: Sulafat
                                name: ''
                                description: ''
                              - value: Umbriel
                                name: ''
                                description: ''
                              - value: Vindemiatrix
                                name: ''
                                description: ''
                              - value: Zephyr
                                name: ''
                                description: ''
                              - value: Zubenelgenubi
                                name: ''
                                description: ''
                          audio_profile:
                            type: string
                            description: >-
                              Audio profile description, e.g., "A warm and
                              soothing narrator" or "A stern and weary
                              gatekeeper"
                          accent:
                            type: string
                            description: Accent, e.g., "British (RP)" or "American (Gen)"
                            enum:
                              - Neutral
                              - American (Gen)
                              - American (Valley)
                              - American (South)
                              - British (RP)
                              - British (Brixton)
                              - Transatlantic
                              - Australian
                            x-apidog-enum:
                              - value: Neutral
                                name: ''
                                description: ''
                              - value: American (Gen)
                                name: ''
                                description: ''
                              - value: American (Valley)
                                name: ''
                                description: ''
                              - value: American (South)
                                name: ''
                                description: ''
                              - value: British (RP)
                                name: ''
                                description: ''
                              - value: British (Brixton)
                                name: ''
                                description: ''
                              - value: Transatlantic
                                name: ''
                                description: ''
                              - value: Australian
                                name: ''
                                description: ''
                          style:
                            type: string
                            description: Emotional style, e.g., "Gentle" or "Deadpan"
                            enum:
                              - Vocal Smile
                              - Newscaster
                              - Whisper
                              - Empathetic
                              - Promo/Hype
                              - Deadpan
                            x-apidog-enum:
                              - value: Vocal Smile
                                name: ''
                                description: ''
                              - value: Newscaster
                                name: ''
                                description: ''
                              - value: Whisper
                                name: ''
                                description: ''
                              - value: Empathetic
                                name: ''
                                description: ''
                              - value: Promo/Hype
                                name: ''
                                description: ''
                              - value: Deadpan
                                name: ''
                                description: ''
                          pace:
                            type: string
                            description: Pace, e.g., "Slow" or "Natural"
                            enum:
                              - Natural
                              - Rapid Fire
                              - The Drift
                              - Staccato
                            x-apidog-enum:
                              - value: Natural
                                name: ''
                                description: ''
                              - value: Rapid Fire
                                name: ''
                                description: ''
                              - value: The Drift
                                name: ''
                                description: ''
                              - value: Staccato
                                name: ''
                                description: ''
                        x-apidog-orders:
                          - speaker_id
                          - voice_name
                          - audio_profile
                          - accent
                          - style
                          - pace
                        required:
                          - speaker_id
                          - voice_name
                          - accent
                        x-apidog-ignore-properties: []
                    dialogue_turns:
                      type: array
                      description: List of dialogue turns, output in sequential order
                      items:
                        type: object
                        properties:
                          speaker_id:
                            type: string
                            description: >-
                              Corresponding speaker identifier, e.g., "Speaker
                              1"
                          text:
                            type: string
                            description: >-
                              The text spoken by the speaker, which may contain
                              tone tags, e.g., "Once upon a time, in a quiet
                              valley hidden away..."
                            maxLength: 10000
                        x-apidog-orders:
                          - speaker_id
                          - text
                        required:
                          - speaker_id
                          - text
                        x-apidog-ignore-properties: []
                  x-apidog-orders:
                    - temperature
                    - scene
                    - sample_context
                    - speakers
                    - dialogue_turns
                  required:
                    - speakers
                    - dialogue_turns
                  x-apidog-ignore-properties: []
              required:
                - model
                - input
              x-apidog-orders:
                - model
                - callBackUrl
                - input
              x-apidog-ignore-properties: []
            example:
              model: google/gemini-3-1-flash-tts
              callBackUrl: https://your-domain.com/api/callback
              input:
                temperature: 1
                scene: A dark, crumbling dungeon...
                sample_context: Fantasy RPG style...
                speakers:
                  - speaker_id: Speaker 1
                    voice_name: Fenrir
                    audio_profile: A stern and weary gatekeeper
                    accent: British (RP)
                    style: Deadpan
                    pace: Natural
                  - speaker_id: Speaker 2
                    voice_name: Puck
                    audio_profile: A determined and courageous traveler seeking answers.
                    accent: American (Gen)
                    style: Empathetic
                    pace: Staccato
                dialogue_turns:
                  - speaker_id: Speaker 1
                    text: >-
                      [shouting] Halt, traveler! The northern pass is sealed by
                      order of the council.
                  - speaker_id: Speaker 2
                    text: >-
                      [determination] I carry a message for the elder. Step
                      aside, or I will force my way through.
                  - speaker_id: Speaker 1
                    text: >-
                      [caution] No one passes. [pensive] The elder is... he's no
                      longer receiving visitors.
                  - speaker_id: Speaker 2
                    text: >-
                      It's too late. [whispers] The shadow... it reached him
                      first. [urgency] You need to leave. [shouting] Now.
      responses:
        '200':
          description: Request successful
          content:
            application/json:
              schema:
                allOf:
                  - type: object
                    x-apidog-refs:
                      01KXQS745D9PR85D93VDCQPDFJ:
                        $ref: '#/components/schemas/ApiResponseWithRecordId'
                        x-apidog-overrides:
                          data: &ref_0
                            type: object
                            properties:
                              taskId:
                                type: string
                                description: >-
                                  Task ID, can be used with Get Task Details
                                  endpoint to query task status
                            x-apidog-orders:
                              - taskId
                            x-apidog-ignore-properties: []
                        required:
                          - data
                    x-apidog-orders:
                      - 01KXQS745D9PR85D93VDCQPDFJ
                    properties:
                      code:
                        type: integer
                        enum:
                          - 200
                          - 401
                          - 402
                          - 404
                          - 422
                          - 429
                          - 455
                          - 500
                          - 501
                          - 505
                        description: >-
                          Response status code


                          - **200**: Success - Request has been processed
                          successfully

                          - **401**: Unauthorized - Authentication credentials
                          are missing or invalid

                          - **402**: Insufficient Credits - Account does not
                          have enough credits to perform the operation

                          - **404**: Not Found - The requested resource or
                          endpoint does not exist

                          - **422**: Validation Error - The request parameters
                          failed validation checks

                          - **429**: Rate Limited - Request limit has been
                          exceeded for this resource

                          - **455**: Service Unavailable - System is currently
                          undergoing maintenance

                          - **500**: Server Error - An unexpected error occurred
                          while processing the request

                          - **501**: Generation Failed - Content generation task
                          failed

                          - **505**: Feature Disabled - The requested feature is
                          currently disabled
                      msg:
                        type: string
                        description: Response message, error description when failed
                        examples:
                          - success
                      data: *ref_0
                    required:
                      - data
                    x-apidog-ignore-properties:
                      - code
                      - msg
                      - data
              example: |-
                {
                    "code": 200,
                    "msg": "success",
                    "data": {
                        "taskId": "task_1765185282276",
                    }
                }
          headers: {}
          x-apidog-name: ''
        '500':
          description: request failed
          content:
            application/json:
              schema:
                type: object
                properties:
                  code:
                    type: integer
                    description: >-
                      Response status code


                      - **200**: Success - Request has been processed
                      successfully

                      - **401**: Unauthorized - Authentication credentials are
                      missing or invalid

                      - **402**: Insufficient Credits - Account does not have
                      enough credits to perform the operation

                      - **404**: Not Found - The requested resource or endpoint
                      does not exist

                      - **408**: Upstream is currently experiencing service
                      issues. No result has been returned for over 10 minutes.

                      - **422**: Validation Error - The request parameters
                      failed validation checks

                      - **429**: Rate Limited - Request limit has been exceeded
                      for this resource

                      - **455**: Service Unavailable - System is currently
                      undergoing maintenance

                      - **500**: Server Error - An unexpected error occurred
                      while processing the request

                      - **501**: Generation Failed - Content generation task
                      failed

                      - **505**: Feature Disabled - The requested feature is
                      currently disabled
                  msg:
                    type: string
                    description: Response message, error description when failed
                  data:
                    type: object
                    properties: {}
                    x-apidog-orders: []
                    x-apidog-ignore-properties: []
                x-apidog-orders:
                  - code
                  - msg
                  - data
                required:
                  - code
                  - msg
                  - data
                x-apidog-ignore-properties: []
              example:
                code: 500
                msg: >-
                  Server Error - An unexpected error occurred while processing
                  the request
                data: null
          headers: {}
          x-apidog-name: 'Error '
      security:
        - BearerAuth: []
          x-apidog:
            schemeGroups:
              - id: kn8M4YUlc5i0A0179ezwx
                schemeIds:
                  - BearerAuth
            required: true
            use:
              id: kn8M4YUlc5i0A0179ezwx
            scopes:
              kn8M4YUlc5i0A0179ezwx:
                BearerAuth: []
      callbacks:
        musicTaskCompleted:
          '{request.body#/callBackUrl}':
            post:
              description: >-
                The system sends this callback when the music task succeeds or
                fails.
              requestBody:
                required: true
                content:
                  application/json:
                    schema:
                      type: object
                      required:
                        - code
                        - msg
                        - data
                      properties:
                        code:
                          type: integer
                          description: >-
                            Unified callback code: 200 for success, 501 for
                            failure.
                          enum:
                            - 200
                            - 501
                        msg:
                          type: string
                          description: Unified callback message.
                          enum:
                            - Playground task completed successfully.
                            - Playground task failed.
                        data:
                          type: object
                          required:
                            - taskId
                            - model
                            - state
                            - param
                            - resultJson
                            - failCode
                            - failMsg
                          properties:
                            taskId:
                              type: string
                              description: The unique task identifier.
                            model:
                              type: string
                              description: The model used for the task.
                              enum:
                                - google/gemini-3-1-flash-tts
                            state:
                              type: string
                              description: Terminal task state.
                              enum:
                                - success
                                - fail
                            param:
                              type: string
                              description: >-
                                JSON string containing the submitted task
                                parameters.
                            resultJson:
                              type: string
                              nullable: true
                              description: >-
                                JSON string containing resultUrls and
                                resultObject when successful. Null when failed.
                            failCode:
                              type: string
                              nullable: true
                              description: Null when successful; failure code when failed.
                            failMsg:
                              type: string
                              nullable: true
                              description: >-
                                Null when successful; failure message when
                                failed.
                            costTime:
                              type: integer
                              format: int64
                              description: >-
                                Task processing time. Present on successful
                                callbacks.
                            completeTime:
                              type: integer
                              format: int64
                              description: Task completion timestamp.
                            createTime:
                              type: integer
                              format: int64
                              description: Task creation timestamp.
                            updateTime:
                              type: integer
                              format: int64
                              description: Task update timestamp.
                            creditsConsumed:
                              type: number
                              description: >-
                                Credits consumed by the task. Present on
                                successful callbacks.
                    examples:
                      success:
                        summary: Task completed successfully
                        value:
                          code: 200
                          msg: Playground task completed successfully.
                          data:
                            taskId: task_example_music_webhook_001
                            model: google/gemini-3-1-flash-tts
                            state: success
                            param: >-
                              {"input":"{\"temperature\":1,\"scene\":\"A dark,
                              crumbling
                              dungeon...\",\"sample_context\":\"Fantasy RPG
                              style...\",\"speakers\":[{\"speaker_id\":\"Speaker
                              1\",\"voice_name\":\"Fenrir\",\"audio_profile\":\"A
                              stern and weary gatekeeper\",\"accent\":\"British
                              (RP)\",\"style\":\"Deadpan\",\"pace\":\"Natural\"}],\"dialogue_turns\":[{\"speaker_id\":\"Speaker
                              1\",\"text\":\"[shouting] Halt, traveler! The
                              northern pass is sealed by order of the
                              council.\"}]}","callBackUrl":"https://example.com/callback","model":"google/gemini-3-1-flash-tts"}
                            resultJson: >-
                              {"resultUrls":["https://example.com/generated-audio.mp3"],"resultObject":null}
                            failCode: null
                            failMsg: null
                            costTime: 12
                            completeTime: 1234567890
                            createTime: 1234560000
                            updateTime: 1234567890
                            creditsConsumed: 1.23
                      failure:
                        summary: Task failed
                        value:
                          code: 501
                          msg: Playground task failed.
                          data:
                            taskId: task_example_music_webhook_001
                            model: google/gemini-3-1-flash-tts
                            state: fail
                            param: >-
                              {"input":"{\"temperature\":1,\"scene\":\"A dark,
                              crumbling
                              dungeon...\",\"sample_context\":\"Fantasy RPG
                              style...\",\"speakers\":[{\"speaker_id\":\"Speaker
                              1\",\"voice_name\":\"Fenrir\",\"audio_profile\":\"A
                              stern and weary gatekeeper\",\"accent\":\"British
                              (RP)\",\"style\":\"Deadpan\",\"pace\":\"Natural\"}],\"dialogue_turns\":[{\"speaker_id\":\"Speaker
                              1\",\"text\":\"[shouting] Halt, traveler! The
                              northern pass is sealed by order of the
                              council.\"}]}","callBackUrl":"https://example.com/callback","model":"google/gemini-3-1-flash-tts"}
                            failCode: GENERATION_FAILED
                            failMsg: The generation task failed.
              responses:
                '200':
                  description: Callback received successfully.
                  content:
                    application/json:
                      schema:
                        type: object
                        properties:
                          code:
                            type: integer
                            example: 200
                          msg:
                            type: string
                            example: success
                      example:
                        code: 200
                        msg: success
      x-apidog-folder: docs/en/Market/Music Models/Gemini
      x-apidog-status: released
      x-run-in-apidog: https://app.apidog.com/web/project/1184766/apis/api-40248549-run
components:
  schemas:
    ApiResponseWithRecordId:
      type: object
      properties:
        code:
          type: integer
          enum:
            - 200
            - 401
            - 402
            - 404
            - 422
            - 429
            - 455
            - 500
            - 501
            - 505
          description: >-
            Response status code


            - **200**: Success - Request has been processed successfully

            - **401**: Unauthorized - Authentication credentials are missing or
            invalid

            - **402**: Insufficient Credits - Account does not have enough
            credits to perform the operation

            - **404**: Not Found - The requested resource or endpoint does not
            exist

            - **422**: Validation Error - The request parameters failed
            validation checks

            - **429**: Rate Limited - Request limit has been exceeded for this
            resource

            - **455**: Service Unavailable - System is currently undergoing
            maintenance

            - **500**: Server Error - An unexpected error occurred while
            processing the request

            - **501**: Generation Failed - Content generation task failed

            - **505**: Feature Disabled - The requested feature is currently
            disabled
        msg:
          type: string
          description: Response message, error description when failed
          examples:
            - success
        data:
          type: object
          properties:
            taskId:
              type: string
              description: >-
                Task ID, can be used with Get Task Details endpoint to query
                task status
            recordId:
              type: string
              description: Record ID, can be used to get the record details
          x-apidog-orders:
            - taskId
            - recordId
          x-apidog-ignore-properties: []
      x-apidog-orders:
        - code
        - msg
        - data
      title: response with recordId
      required:
        - data
      x-apidog-ignore-properties: []
      x-apidog-folder: ''
  securitySchemes:
    BearerAuth:
      type: bearer
      scheme: bearer
      bearerFormat: API Key
      description: >-
        All API requests require a Bearer Token. Add the header `Authorization:
        Bearer YOUR_API_KEY` to authenticate requests.
    BearerAuth1:
      type: bearer
      scheme: bearer
      bearerFormat: API Key
      description: >-
        所有 API 请求都需要 Bearer Token。请在请求头中添加 `Authorization: Bearer YOUR_API_KEY`
        进行身份验证。
servers:
  - url: https://api.kie.ai
    description: 正式环境
security:
  - BearerAuth: []
    x-apidog:
      schemeGroups:
        - id: kn8M4YUlc5i0A0179ezwx
          schemeIds:
            - BearerAuth
      required: true
      use:
        id: kn8M4YUlc5i0A0179ezwx
      scopes:
        kn8M4YUlc5i0A0179ezwx:
          BearerAuth: []

```
